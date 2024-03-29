import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define a function that you want to call
function performAction(action: string, parameter: any): void {
  console.log(`Performing action: ${action} with parameter: ${parameter}`);
  // Define your action handling logic here
}

const app = express();
const port = 3000; // Port number for the HTTP server

// Middleware to parse JSON bodies
app.use(express.json());

app.post('/webhook', (req: Request, res: Response) => {
  // Extract the token, action, and parameter from the request body
  const { token, action, parameter } = req.body;

  // Check if the token matches the secret token stored in environment variables
  if (token !== process.env.SECRET_TOKEN) {
    res.status(401).send('Unauthorized: Invalid token');
    return;
  }

  // Assuming the token is correct, call the desired function
  try {
    console.log("Received request with action: ", action); // action
    res.send('Action performed successfully');
  } catch (error) {
    res.status(500).send('Error performing action');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
