# Overview

This is a personal finance management web application built with React and Express.js with complete authentication system. The system allows users to track income and expenses, categorize transactions, set budgets, and view financial summaries through an intuitive dashboard interface. The application features user authentication with login/registration, user profile management with photo upload, advanced transaction filtering, and credit card management. The application is designed to be simple, responsive, and free to use, providing essential financial tracking capabilities without payment requirements.

# User Preferences

Preferred communication style: Simple, everyday language.
Theme: Green color scheme instead of blue.
Data export functionality: Removed as requested.
Authentication: Implemented complete user login/registration system.
UI Language: Portuguese (Brazilian).

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with green color theme and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Authentication**: LocalStorage-based user session management
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js for financial data visualization
- **File Upload**: Avatar support with automatic image generation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful API with JSON responses
- **Development Mode**: Vite middleware integration for hot reloading
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development

## Database Schema Design
- **Categories**: Store transaction categories with icons, colors, and types (income/expense)
- **Transactions**: Core financial data with amounts, dates, payment methods, and installment support
- **Budgets**: Monthly budget limits per category
- **Settings**: Key-value configuration storage
- **Features**: UUID primary keys, decimal precision for currency, installment tracking

## Component Architecture
- **Authentication System**: Complete login/registration flow with user profile management
- **Advanced Filtering**: Comprehensive transaction history filters with search, period, type, and category filters
- **User Management**: Profile editing with avatar support and logout functionality
- **Modular Design**: Separate components for forms, charts, summaries, navigation, and authentication
- **Reusable UI**: Consistent green-themed design system with shadcn/ui components
- **Responsive Layout**: Mobile-first design with adaptive navigation
- **Form Validation**: Zod schemas shared between client and server

## Development Workflow
- **Hot Reloading**: Vite development server with Express middleware
- **Type Safety**: Full TypeScript coverage with shared types
- **Database Migrations**: Drizzle Kit for schema management
- **Code Organization**: Monorepo structure with shared schema definitions

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL hosting (@neondatabase/serverless)
- **Connection**: Environment-based DATABASE_URL configuration

## Object Storage
- **Replit Object Storage**: Cloud storage for file uploads and assets
- **Google Cloud Storage**: Backend storage infrastructure
- **Uppy**: Modern file upload library with React integration

## UI and Design
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **Chart.js**: Canvas-based charting library for data visualization

## Development Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **TypeScript**: Static type checking and enhanced development experience

## Form and Validation
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: Schema validation library for type-safe data validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

## Session Management
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **Express Session**: Session middleware for user state management

## Utility Libraries
- **Date-fns**: Modern JavaScript date utility library
- **Class Variance Authority**: Utility for building type-safe component variants
- **CLSX**: Utility for constructing className strings conditionally

# Recent Changes (August 2025)

## VT/VR Calculation Enhancement
- Implemented precise working days calculation excluding Brazilian national holidays, São Paulo state holidays, and São Paulo municipal holidays
- Easter-based holidays (Good Friday, Corpus Christi) automatically calculated for any year
- Monthly VT/VR now varies based on actual working days per month

## Chart and Data Visualization
- Charts now follow selected month/year instead of fixed March-August range  
- Month labels include year format (ex: "ago/25" for August 2025)
- Fixed data leakage between months - each period shows only its own transactions

## Recurring Transactions
- Automatic propagation of recurring income/expenses to future months (24 months ahead)
- Recurring transactions linked via parentTransactionId for tracking
- Smart editing system: option to edit "apenas esta" or "todas as recorrentes"
- Smart deletion system: option to delete single or all recurring transactions

## Profile Management
- Object storage configured for future real file uploads
- Advanced photo editor with manual crop positioning to prevent distortion
- Interactive crop tool with drag-and-drop positioning
- White background support to prevent dark/transparent images

## Transaction Management
- Complete transaction editing modal with form validation
- Recurring transaction detection and specialized editing options
- Full CRUD operations for all transaction types

## Credit Card Installment System (August 16, 2025)
- Fixed critical bug in installment credit limit calculation
- Installment transactions now correctly reserve full purchase amount in credit limit
- Example: R$ 500 in 4x installments correctly uses R$ 500 limit (not R$ 625)
- Intelligent installment deletion: option to delete single installment or all installments
- Visual indicators show installment progress (1/4x, 2/4x, etc.) in transaction list
- Proper credit limit release when installment transactions are deleted

## Year Support
- System supports unlimited years (not restricted to 2024-2026)
- All calculations work dynamically for any year selected
- Historical and future data handled seamlessly