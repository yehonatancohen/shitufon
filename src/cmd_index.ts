import * as fs from 'fs';
import * as path from 'path';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('No arguments provided.');
    process.exit(1);
}

// Print received arguments
console.log('Received arguments:', args);

// Check if the first argument is a file
const filePath = path.resolve(args[0]);
if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    // Read and print file content
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            process.exit(1);
        }
        console.log('File content:', data);
    });
} else {
    console.log('The provided argument is not a valid file path.');
}