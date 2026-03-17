import sys
import pdfplumber

def extract_text(pdf_path):
    try:
        text_content = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
                else:
                    # Attempt table extraction if raw text is empty (scanned image with grid lines)
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            for row in table:
                                text_content.append(" ".join([str(cell) if cell else "" for cell in row]))
        
        final_text = "\n".join(text_content).strip()
        
        if not final_text:
            print("OCR_FAILED: No readable text or tables found by pdfplumber.", file=sys.stderr)
            sys.exit(1)
            
        print(final_text)
        sys.exit(0)
    except Exception as e:
        print(f"OCR_ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_text.py <path_to_pdf>", file=sys.stderr)
        sys.exit(1)
    
    extract_text(sys.argv[1])
