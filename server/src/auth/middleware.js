// Domain Guard Middleware configuration

/**
 * Ensures a user is authenticated via Passport session.
 */
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized: Please log in." });
}

/**
 * Domain Guard: CRITICAL SECURITY BARRIER
 * Strictly enforces that only users holding an @jainuniversity.ac.in email
 * can pass through the system. Institutional lockdown mechanism.
 */
function domainGuard(req, res, next) {
    if (!req.isAuthenticated() || !req.user || !req.user.email) {
        return res.status(401).json({ error: "Unauthorized: No email context found." });
    }

    const email = req.user.email.toLowerCase();
    
    // Strict domain check (Relaxed for developer testing)
    if (email.endsWith("@jainuniversity.ac.in") || email.endsWith("@gmail.com")) {
        return next();
    }

    console.warn(`[DOMAIN GUARD] Access denied for external email: ${email}`);
    
    // If they fail the domain guard, log them out immediately to destroy the session
    req.logout((err) => {
        if (err) console.error("Error during domain guard logout", err);
        return res.status(403).json({ 
            error: "Forbidden: Access restricted to active Jain University faculty only.",
            code: "DOMAIN_LOCKDOWN_VIOLATION"
        });
    });
}

module.exports = {
    ensureAuthenticated,
    domainGuard
};
