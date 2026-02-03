# Favorability Hotspot Map

A collaborative Web GIS application that collects user favorability votes (0-5) and generates a favorability hotspot map for Tehran city.

## Features

- **Interactive Map**: View Tehran with OSM basemap and boundary visualization using Leaflet
- **Vote Submission**: Users can select locations within Tehran and submit favorability scores
- **Hotspot Visualization**: Real-time heatmap showing favorability hotspots based on user votes using KDE
- **Spatial Validation**: All votes are validated to ensure they fall within Tehran's boundary
- **Responsive Design**: Works on desktop and mobile devices
- **React-based**: Built with React 18 and Vite for fast development

## Tech Stack

- **Frontend**: React 18 with Vite
- **Map Library**: Leaflet + React-Leaflet
- **Spatial Analysis**: Turf.js + KDE (Kernel Density Estimation)
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **Deployment**: Netlify (Automatic builds via Git)

## Project Structure

```
frontend/
├── index.html              # Main HTML entry point
├── main.jsx                # React application entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── netlify.toml            # Netlify deployment config
├── .env.example            # Environment variables template
├── .env.production.example # Netlify environment variables template
├── public/
│   └── tehran_bound.geojson # Tehran boundary GeoJSON
└── src/
    ├── main.jsx            # Application entry point
    ├── App.jsx             # Main App component
    ├── App.css             # Main styles
    ├── config/
    │   └── supabase.js     # Supabase configuration
    ├── components/
    │   ├── Map/
    │   │   ├── TehranMap.jsx       # Main map component
    │   │   ├── BoundaryLayer.jsx   # Tehran boundary layer
    │   │   ├── VotesLayer.jsx       # Votes markers layer
    │   │   └── FavoribilityLayer.jsx # Hotspot heatmap layer
    │   └── UI/
    │       ├── Header.jsx          # App header
    │       ├── Legend.jsx          # Map legend
    │       ├── VoteModal.jsx       # Vote submission modal
    │       ├── FavoribilityToggle.jsx # Toggle hotspot layer
    │       ├── VotesToggle.jsx     # Toggle votes markers
    │       └── SelectionButton.jsx # Location selection button
    ├── workers/
    │   └── favoribilityWorker.js   # KDE calculation web worker
    └── services/
        └── supabase.js     # Supabase service layer
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project with PostGIS enabled

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Enable the PostGIS extension and create the `votes` table by running the SQL in [`sql/schema.sql`](sql/schema.sql) in the Supabase SQL Editor

3. Get your project credentials:
   - Supabase URL: Project Settings > API > Project URL
   - Anon Key: Project Settings > API > anon public key

### Local Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Add your Supabase credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
cd frontend
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Automatic Deployment with Netlify

1. Push your frontend code to a Git repository (GitHub/GitLab)

2. Go to [Netlify Dashboard](https://app.netlify.com)

3. Click **"Add new site"** → **"Import an existing project"**

4. Select your GitHub repository

5. Netlify auto-detects:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

7. Click **"Deploy site"**

Netlify will automatically build and deploy when you push changes to your repository.

### Manual Deployment

You can deploy the `dist/` folder to any static hosting service:
- Vercel
- Cloudflare Pages
- GitHub Pages
- AWS S3 + CloudFront

## Usage

1. Click **"Select your favorite place"** button
2. Click on the map within the Tehran boundary (red outline)
3. Enter your name and select a favorability score (0-5)
4. Click **"Submit Vote"**
5. The hotspot map will update immediately with your vote

## Database Schema

The application uses a single table `votes` with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| user_name | text | User's name (required) |
| score | integer | Favorability score 0-5 (required) |
| geom | geometry(Point, 4326) | Location coordinates (required) |
| created_at | timestamptz | Creation timestamp (auto-generated) |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Hotspot Calculation

The hotspot visualization uses Kernel Density Estimation (KDE) with a web worker for performance:

- **Bandwidth**: 0.03 degrees
- **Cell size**: 0.005 degrees
- **Weight**: Votes are weighted by their favorability score
- **Calculation**: Runs in a background web worker to avoid blocking the UI

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
