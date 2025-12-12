# AI Band Submission System

This directory contains the server-side infrastructure for handling user submissions of AI-generated music artists for the Grayjay YouTube plugin's filter database.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables:

```bash
export ADMIN_TOKEN=your-secret-admin-token
export PORT=3000
```

3. Run the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Submit AI Band

**POST** `/api/submit-ai-band`

Submit a new AI-generated music artist for review.

**Request Body:**

```json
{
  "artistName": "AI Artist Name",
  "youtubeUrl": "https://www.youtube.com/@artist-channel",
  "verificationLinks": "https://verification-link.com\nhttps://another-link.com",
  "otherPlatforms": "https://spotify.com/artist/...\nhttps://music.apple.com/...",
  "additionalInfo": "Optional additional context"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Submission received successfully",
  "submissionId": "1640995200000"
}
```

### Admin: Get Submissions

**GET** `/api/admin/submissions`

Get all submissions (requires admin authentication).

**Headers:**

```
Authorization: Bearer your-admin-token
```

### Admin: Approve/Reject Submission

**POST** `/api/admin/submissions/:id`

Approve or reject a submission.

**Headers:**

```
Authorization: Bearer your-admin-token
```

**Request Body:**

```json
{
  "action": "approve", // or "reject"
  "aiBandsPath": "../ai-bands.json" // optional, defaults to ../ai-bands.json
}
```

## File Structure

- `server.js` - Express server handling submissions
- `submit-ai-band.html` - Web form for user submissions
- `submissions.json` - Stores pending submissions
- `package.json` - Node.js dependencies

## Security Notes

- The admin endpoints use a simple Bearer token authentication
- In production, implement proper authentication (OAuth, JWT, etc.)
- The server stores submissions in a local JSON file
- Consider using a database for production deployments

## Deployment

### Local Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker (optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Integration with Plugin

The plugin's "Submit AI Band" action directs users to the HTML form hosted at:
`https://your-domain.com/submit-ai-band.html`

The form posts to `/api/submit-ai-band` on the same domain.

## Workflow

1. User clicks "Submit AI Band" in plugin settings
2. Plugin shows toast with instructions and opens form URL
3. User fills out form and submits
4. Server validates and stores submission
5. Admin reviews submissions via `/api/admin/submissions`
6. Approved submissions are added to `ai-bands.json`
7. Plugin updates include new AI band entries

## Environment Variables

- `ADMIN_TOKEN` - Secret token for admin API access
- `PORT` - Server port (default: 3000)
