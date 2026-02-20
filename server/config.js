// ============================================================
//  CONFIGURATION FILE
//  Environment-based configuration
// ============================================================

require('dotenv').config();

module.exports = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Pakasir API
    PROJECT_SLUG: process.env.PROJECT_SLUG || 'cupzyyy',
    API_KEY: process.env.API_KEY || 'x5ex44h3cexOAvi37EOEKMlFvRPsGa3f',
    PAKASIR_BASE: 'https://app.pakasir.com/api',
    
    // Security
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
    
    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:3000']
};
