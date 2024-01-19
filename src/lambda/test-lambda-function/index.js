// Lambda function handler
exports.handler = async (event, context) => {
    try {
        // Your logic goes here

        // Example: Log the incoming event
        console.log("Received event:", JSON.stringify(event, null, 2));

        // Example: Return a response
        const response = {
            statusCode: 200,
            body: JSON.stringify("Hello from Lambda!"),
        };

        return response;
    } catch (error) {
        console.error("Error:", error);

        // Example: Return an error response
        const errorResponse = {
            statusCode: 500,
            body: JSON.stringify("Internal Server Error"),
        };

        return errorResponse;
    }
};
