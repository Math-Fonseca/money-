# Overview

This is a personal finance management web application built with React and Express.js. The system allows users to track income and expenses, categorize transactions, set budgets, and view financial summaries through an intuitive dashboard interface. The application is designed to be simple, responsive, and free to use, providing essential financial tracking capabilities without payment requirements.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js for financial data visualization

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
- **Modular Design**: Separate components for forms, charts, summaries, and navigation
- **Reusable UI**: Consistent design system with shadcn/ui components
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