# 🚗 RideMate Campus

> **A premium, verified campus ride-sharing platform built with modern web technologies**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

RideMate Campus is a comprehensive ride-sharing solution designed specifically for college campuses. It connects verified students and faculty members for safe, eco-friendly rides with real-time tracking, smart matching, and parent notifications.

---

## ✨ Features

### 🔐 **Security & Verification**
- College email verification (.edu domains)
- Admin approval system for all users
- Enhanced driver verification with license & confirmation letters
- Parent phone number integration for safety alerts
- Two-factor OTP verification before ride starts

### 🚘 **Smart Ride Management**
- **For Drivers:**
  - Create one-time or recurring rides
  - Accept/reject passenger requests
  - Real-time GPS tracking with turn-by-turn navigation
  - Live chat with passengers
  - Automatic parent notifications (ride start, midway, completion)
  
- **For Passengers:**
  - Search rides by destination with proximity sorting
  - View driver ratings and vehicle details
  - Real-time ride tracking
  - In-ride chat functionality
  - Secure payment integration

### 📍 **Advanced Tracking**
- Live GPS tracking with 100m recalculation intervals
- Parent tracking portal with read-only access
- Turn-by-turn navigation powered by OpenRouteService
- Offline route caching for network resilience
- Distance-traveled monitoring with midway notifications

### 🚨 **Safety Features**
- One-click SOS button sending alerts to all parents
- Real-time location sharing
- Driver rating and feedback system
- Ride verification with unique OTPs
- Emergency contact integration

### 🌱 **Eco Impact Dashboard**
- Track fuel saved (liters)
- Monitor carbon footprint reduction (kg)
- Visualize total distance shared
- Gamified eco-achievements

### 💳 **Payment & Ratings**
- Distance-based fare calculation (₹8/km)
- Stripe payment integration
- Post-ride feedback and rating system
- Payment status tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Services              │
│  • Auth         │  • EnhancedMap   │  • Supabase Client     │
│  • Dashboard    │  • RideChat      │  • API Integrations    │
│  • LiveTracking │  • FileUpload    │  • Realtime Channels   │
│  • FindRides    │  • RidePayment   │                        │
│  • Profile      │  • FeedbackForm  │                        │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Supabase)                         │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)  │  Edge Functions                   │
│  • profiles             │  • publish-location               │
│  • rides                │  • get-directions                 │
│  • ride_requests        │  • send-sos-sms                   │
│  • driver_details       │  • send-ride-update-sms           │
│  • eco_impact           │  • send-location-sms              │
│  • feedback             │                                   │
│                         │  Storage Buckets                  │
│  Realtime Channels      │  • profile-photos                 │
│  • location-updates     │  • driver-documents               │
│  • ride-status          │                                   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   External APIs                              │
├─────────────────────────────────────────────────────────────┤
│  • OpenRouteService (ORS) - Turn-by-turn directions         │
│  • Twilio - SMS notifications to parents                    │
│  • Pusher - Real-time location broadcasting                 │
│  • Stripe - Payment processing                              │
│  • Nominatim - Address geocoding                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- API keys for: Twilio, Pusher, Stripe, OpenRouteService

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ridemate-campus.git
cd ridemate-campus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# Pusher (for real-time tracking)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster

# Stripe (for payments)
STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret

# OpenRouteService (for directions)
ORS_API_KEY=your_ors_api_key
```

---

## 📁 Project Structure

```
ridemate-campus/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── EnhancedMap.tsx # Advanced map with clustering
│   │   ├── RideChat.tsx    # Real-time chat component
│   │   ├── FileUpload.tsx  # File upload to Supabase Storage
│   │   └── ...
│   ├── pages/              # Route components
│   │   ├── Auth.tsx        # Sign in/Sign up
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── CreateRide.tsx  # Driver: Create new ride
│   │   ├── FindRides.tsx   # Passenger: Search rides
│   │   ├── MyRides.tsx     # Driver: Manage rides
│   │   ├── PassengerRides.tsx # Passenger: View requests
│   │   ├── LiveTracking.tsx   # Driver: Live GPS tracking
│   │   ├── ParentTracking.tsx # Parent: Read-only tracking
│   │   ├── Profile.tsx     # User profile management
│   │   ├── BecomeDriver.tsx # Driver application
│   │   ├── EcoImpact.tsx   # Eco statistics
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts   # Supabase client configuration
│   ├── lib/
│   │   ├── rideMatching.ts # Smart ride matching logic
│   │   └── utils.ts        # Helper functions
│   ├── hooks/
│   │   ├── use-toast.ts    # Toast notifications
│   │   └── use-mobile.tsx  # Mobile detection
│   ├── App.tsx             # Root component with routes
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── publish-location/
│   │   ├── get-directions/
│   │   ├── send-sos-sms/
│   │   └── ...
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🔑 Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Framework | 18.3+ |
| **TypeScript** | Type Safety | 5.5+ |
| **Vite** | Build Tool | 5.4+ |
| **Supabase** | Backend (Auth, DB, Realtime, Storage) | Latest |
| **Tailwind CSS** | Styling | 3.4+ |
| **shadcn/ui** | UI Components | Latest |
| **Leaflet** | Map Rendering | 1.9+ |
| **React Query** | Data Fetching | 5.56+ |
| **date-fns** | Date Formatting | 4.1+ |
| **Lucide React** | Icons | 0.263+ |

---

## 🗄️ Database Schema

### Core Tables

**profiles**
- User information (name, phone, gender, photo)
- Primary location coordinates
- User type (student/faculty)
- Driver status and approval

**rides**
- Start/end locations with coordinates
- Scheduled time
- Available seats
- Status (scheduled, active, completed)
- Recurring ride flag

**ride_requests**
- Links passengers to rides
- Pickup location
- Status (pending, accepted, rejected)
- OTP for verification
- Distance and fare calculation
- Payment status

**driver_details**
- License information
- Vehicle details
- Confirmation letter
- Approval status

**eco_impact**
- Distance shared
- Fuel saved
- Carbon reduced

**feedback**
- Passenger ratings
- Driver ratings
- Comments

---

## 🔄 Key User Flows

### 1. Student Sign-Up Flow
```
User enters college email (.edu) → Email verification → 
Admin approval → Profile setup → Ready to use
```

### 2. Become Driver Flow
```
Apply with license → Upload documents → Submit parent contact → 
Admin verification → Driver approval → Can create rides
```

### 3. Request Ride Flow (Passenger)
```
Search destination → View nearby rides → Request ride → 
Driver accepts → Receive OTP → Share OTP → Ride starts → 
Live tracking → Ride completes → Payment → Rate driver
```

### 4. Create Ride Flow (Driver)
```
Create ride details → Set route → Accept requests → 
Collect OTPs → Start ride → GPS tracking → Auto SMS notifications → 
Complete ride → Rate passengers
```

### 5. Live Tracking Flow
```
Driver starts GPS → Publishes location every 5s → 
Passengers/Parents receive updates via Pusher → 
Turn-by-turn directions update every 100m → 
Midway SMS sent at 50% → Completion SMS on arrival
```

---

## 🔒 Security Features

- **Authentication**: Supabase Auth with email verification
- **Authorization**: Row Level Security (RLS) on all tables
- **Data Validation**: Server-side validation in Edge Functions
- **File Upload**: Secure storage with signed URLs
- **API Keys**: Environment-based configuration
- **Rate Limiting**: Supabase Edge Function limits
- **HTTPS**: Enforced on all connections
- **Input Sanitization**: XSS protection on all inputs

---

## 🧪 Testing

```bash
# Run unit tests (when implemented)
npm run test

# Run E2E tests (when implemented)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📱 Mobile Responsiveness

The application is fully responsive with:
- Mobile-first design approach
- Touch-optimized UI elements
- Adaptive layouts for all screen sizes
- Progressive Web App (PWA) capabilities
- Offline route caching

---

## 🌍 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Manual Build

```bash
npm run build
# Deploy the 'dist' folder to any static host
```

### Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features

---

## 🐛 Known Issues & Limitations

- GPS accuracy depends on device capabilities
- Offline mode limited to cached routes only
- SMS delivery depends on Twilio service availability
- Real-time updates require stable internet connection
- Payment processing requires KYC verification

---

## 📋 Roadmap

- [ ] Multi-language support (Hindi, Telugu, Tamil)
- [ ] In-app voice calls between driver and passenger
- [ ] AI-powered ride matching based on preferences
- [ ] Carbon credits and rewards system
- [ ] Integration with campus event calendars
- [ ] Split payment for group rides
- [ ] Driver behavior analytics
- [ ] Emergency contact auto-dial feature
- [ ] Ride scheduling 7 days in advance
- [ ] Native mobile apps (iOS/Android)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team & Contact

**Project Maintainer**: Your Name  
**Email**: your.email@example.com  
**GitHub**: [@yourusername](https://github.com/yourusername)  
**Website**: [ridemate-campus.com](https://ridemate-campus.com)

For support, email support@ridemate-campus.com or join our [Discord community](https://discord.gg/yourserver).

---

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful UI components
- **Supabase** for the amazing backend platform
- **OpenRouteService** for routing capabilities
- **Twilio** for reliable SMS delivery
- **Leaflet** for powerful mapping
- All contributors and testers

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/ridemate-campus?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/ridemate-campus?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/ridemate-campus)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/ridemate-campus)
![GitHub last commit](https://img.shields.io/github/last-commit/yourusername/ridemate-campus)

---

<div align="center">

[⬆ back to top](#-ridemate-campus)

</div>