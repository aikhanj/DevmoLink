# devmolink

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager
- Google Cloud Console account for OAuth credentials

### Environment Setup

1. Clone the repository

```bash
git clone [repository-url]
cd devmolink
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

```bash
# Copy the example env file
cp .env.example .env
```

Configure the following variables in your `.env` file:

- `GOOGLE_CLIENT_ID`: Get from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Get from Google Cloud Console
- `NEXTAUTH_URL`: Use `http://localhost:3000` for local development
- `NEXTAUTH_SECRET`: Generate using `openssl rand -base64 32`
- `NEXT_PUBLIC_USE_MOCK_DATA`: Set to `false` for development
- `NEXT_PUBLIC_ENVIRONMENT`: Set to `development`
- `NEXT_PUBLIC_TEST_MODE`: Set as needed

To get Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google OAuth2 API
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-production-domain.com/api/auth/callback/google` (production)

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Project Structure

- `/src/app` - Next.js 13+ app directory
  - `/api` - API routes
  - `/components` - Reusable React components
  - `/utils` - Utility functions

### Important Notes

- Never commit the `.env` file to version control
- Each developer should maintain their own environment variables
- Production credentials should be managed through secure systems
- Regular security updates and credential rotation is recommended

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

built by [aikhan jumashukurov](https://aikhanjumashukurov.com)
princeton cs · ai researcher · kyrgyz government innovation recognition.
