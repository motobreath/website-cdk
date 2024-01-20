// Lambda function handler
exports.handler = async (event, context) => {
   // Extract the request path and HTTP method
  const path = event.path;
  const httpMethod = event.httpMethod;

  // Create the response body
  const body = {
    message: `You requested ${httpMethod} ${path}`
  };

  // Create the response headers
  const headers = {
    "Content-Type": "application/json"
  };

  // Return the API Gateway response
  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(body)
  };
};
