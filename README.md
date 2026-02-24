# AI-Powered Community Impact Tracker

A comprehensive web application that leverages artificial intelligence and blockchain technology to measure, verify, and visualize the real-world impact of community development programs. Built with React, TypeScript, and Supabase.

## 🌟 Features

### Core Functionality
- **Real-time Dashboard**: Track community impact metrics, milestones, and token rewards
- **Blockchain Integration**: Automated reward distribution via smart contracts
- **AI-Powered Chat**: Conversational AI assistant for guidance and support
- **Voice Features**: Text-to-speech responses and voice input for milestone submissions
- **Video Generation**: AI avatar videos for milestone celebrations and announcements
- **Community Management**: Admin tools for managing communities and programs

### Authentication & Security
- **Secure Authentication**: Email/password with optional 2FA
- **Session Management**: Automatic session refresh and expiry warnings
- **Password Reset**: Secure password reset flow with email verification
- **Role-based Access**: Different permissions for participants and administrators

### Data & Analytics
- **Real Database Integration**: Live data from Supabase
- **Impact Visualization**: Charts and metrics showing community progress
- **Milestone Tracking**: Complete milestone lifecycle management
- **Token Management**: IMPACT token balance and transaction history

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- (Optional) API keys for enhanced features:
  - ElevenLabs for voice features
  - Tavus.io for video generation
  - OpenAI for enhanced AI chat

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd community-impact-tracker
npm install
```

2. **Environment Setup**:
```bash
cp .env.example .env
```

3. **Configure environment variables** in `.env`:
```env
# Required - Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - Enhanced Features
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_TAVUS_API_KEY=your_tavus_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

4. **Start development server**:
```bash
npm run dev
```

5. **Access the application**:
   - Open http://localhost:5173
   - Use demo credentials: `demo@communityimpact.org` / `demo123`

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive styling
- **Framer Motion** for smooth animations
- **React Router** for navigation
- **Recharts** for data visualization

### Backend & Database
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for live data updates

### External Integrations
- **ElevenLabs**: Text-to-speech and voice generation
- **Tavus.io**: AI avatar video generation
- **Blockchain**: MetaMask integration for token rewards
- **OpenAI**: Enhanced AI chat capabilities

## 📊 Database Schema

The application uses a comprehensive database schema with the following main tables:

- **users**: User profiles and authentication data
- **communities**: Community organizations and groups
- **programs**: Community development programs
- **milestones**: Achievement milestones within programs
- **achievements**: User milestone completions
- **rewards**: Token rewards for achievements
- **interactions**: AI chat interactions

## 🎯 Key Components

### Dashboard Components
- `DatabaseMilestones`: Real milestone data from database
- `DatabaseTokenBalance`: Live token balance and transactions
- `RealTimeMetrics`: Community statistics with live updates
- `AdvancedCharts`: Data visualization and analytics

### Authentication System
- `AuthModal`: Complete sign-in/sign-up flow
- `SessionManager`: Session monitoring and refresh
- `PasswordResetForm`: Secure password reset
- `TwoFactorAuth`: Optional 2FA setup

### AI & Media Features
- `AIChat`: Conversational AI assistant
- `VoiceSettings`: Voice customization and preview
- `VideoGenerator`: AI avatar video creation
- `VoiceInput`: Voice-to-text milestone submissions

### Admin Tools
- `AdminDashboard`: Community management interface
- `CommunityReferralManager`: Member invitation system

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
```

### Code Organization
- `src/components/`: Reusable UI components
- `src/pages/`: Main application pages
- `src/hooks/`: Custom React hooks
- `src/lib/`: Service layers and utilities
- `src/types/`: TypeScript type definitions

### Testing
```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
```

## 🌐 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables for Production
Ensure all required environment variables are set in your production environment:
- Supabase URL and keys
- API keys for external services
- Blockchain RPC URLs

### Deployment Platforms
The application can be deployed to:
- **Netlify** (recommended)
- **Vercel**
- **AWS Amplify**
- Any static hosting service

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **JWT-based authentication** with automatic refresh
- **API key validation** with graceful fallbacks
- **Input sanitization** and validation
- **HTTPS enforcement** in production

## 🎨 UI/UX Features

- **Responsive design** for all screen sizes
- **Dark/light mode** support
- **Accessibility compliance** (WCAG 2.1 AA)
- **Smooth animations** and micro-interactions
- **Loading states** and error handling
- **Progressive Web App** capabilities

## 📱 Mobile Support

- Fully responsive design
- Touch-friendly interactions
- Mobile-optimized navigation
- Voice input support on mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Community**: Join our Discord for discussions

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Enhanced blockchain features
- [ ] API for third-party integrations
- [ ] Machine learning insights

---

**Built with ❤️ for community impact and social good**
