const config = {
    API_URL: process.env.NODE_ENV === 'production' 
        ? 'https://restaurant-backend-n306.onrender.com' 
        : 'http://localhost:5000'
};

export default config;