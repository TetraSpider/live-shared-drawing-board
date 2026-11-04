# Live Shared Drawing Board

A real-time collaborative drawing app built with Node.js, Express, and Socket.IO. Everyone who opens the public URL draws on the same canvas. New visitors receive the current board history.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in your browser. Open it in multiple tabs to test shared drawing.

## Deploy on Render

1. Create a GitHub repository and upload these project files.
2. Sign in to Render and choose **New +** then **Web Service**.
3. Connect the GitHub repository.
4. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/health`
5. Deploy and open the public `onrender.com` URL Render provides.
6. Test the deployed URL in at least ten separate browser windows, tabs, or devices.

The included `render.yaml` can supply the service settings if you choose Render's Blueprint workflow.

## Important notes

- Drawing strokes and clear-board actions are broadcast in real time using Socket.IO.
- The board history is kept in server memory. It is not permanent storage and will reset if the service restarts or sleeps.
- A clear action clears the board for everyone.
- For a classroom demo, open the deployed URL on multiple devices before class and confirm the live connection indicator appears.
