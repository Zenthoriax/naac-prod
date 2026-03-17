"use strict";

// Suppress pdf-parse debug output in production
if (process.env.NODE_ENV === "production") {
  const orig = console.log;
  console.log = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("pdf-parse")) return;
    orig(...args);
  };
}

const pdfParse = require("pdf-parse");

/* Clean trailing punctuation from URLs */
function cleanUrl(raw) {
  return raw.replace(/[.,;:!?)"'>\]]+$/, "").trim();
}

/* Extract surrounding context for a URL */
function getContext(text, url, maxChars = 240) {
  const idx = text.indexOf(url);
  if (idx === -1) return "";
  const start   = Math.max(0, idx - maxChars);
  const end     = Math.min(text.length, idx + url.length + maxChars);
  return text.slice(start, end).replace(/\s+/g, " ").replace(url, "").trim().slice(0, 250);
}

module.exports = async function extractHandler(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: "No PDF uploaded. Use multipart/form-data with field name 'file'.",
    });
  }

  let data;
  try {
    data = await pdfParse(req.file.buffer, {
      // Disable rendering artifacts warning
      pagerender: null,
    });
  } catch (err) {
    const isPasswordProtected = err.message?.toLowerCase().includes("password");
    return res.status(422).json({
      error: isPasswordProtected
        ? "PDF is password-protected. Remove the password and re-upload."
        : "Could not parse PDF. The file may be corrupted or not a valid PDF.",
      detail: err.message,
    });
  }

  const text = data.text || "";

  if (!text.trim()) {
    return res.status(422).json({
      error: "No text found in PDF. The file may be image-based (scanned). Please run OCR first at https://www.ilovepdf.com/ocr-pdf and re-upload.",
    });
  }

  // Extract all URLs
  const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\])\]]+/gi;
  const rawMatches = text.match(URL_REGEX) || [];
  const cleaned = rawMatches
    .map(cleanUrl)
    .filter(u => u.length > 10 && u.includes("."));

  // Deduplicate preserving first occurrence
  const seen = new Set();
  const unique = cleaned.filter(u => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const links = unique.map(url => ({
    url,
    context: getContext(text, url),
  }));

  return res.json({
    links,
    totalFound: links.length,
    pageCount:  data.numpages || 0,
    info: {
      title:  data.info?.Title  || null,
      author: data.info?.Author || null,
    },
  });
};
