# Municipality Citizen Backend API

A professional Node.js backend API for a municipality citizen engagement platform with authentication, profile management, and project support features.

## 🚀 Features

- **User Authentication**: Registration, login, password reset, email verification
- **Profile Management**: User profiles with local file storage, personal information
- **Media Management**: Local file upload and storage for images, documents, and videos
- **Security**: JWT tokens, password hashing, rate limiting, input validation
- **Professional Structure**: Modular architecture, error handling, logging
- **Beginner Friendly**: Well-documented code with clear comments

## 📁 Project Structure

\`\`\`
src/
├── config/          # Configuration files
├── controllers/     # Route controllers (business logic)
├── middleware/      # Custom middleware functions
├── models/         # Database models (Mongoose schemas)
├── routes/         # API route definitions
├── utils/          # Utility functions and helpers
├── validators/     # Input validation schemas
└── server.js       # Main application entry point
uploads/            # Local file storage directory
\`\`\`

## 🛠️ Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd municipality-backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env file with your configuration
   \`\`\`

4. **Start MongoDB**
   Make sure MongoDB is running on your system

5. **Run the application**
   \`\`\`bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   \`\`\`

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email

### User Routes (`/api/user`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /avatar` - Upload profile avatar
- `DELETE /avatar` - Remove profile avatar
- `PUT /change-password` - Change password
- `DELETE /account` - Delete user account

### Media Routes (`/api/media`)
- `POST /projects/:projectId/images` - Upload project images
- `POST /projects/:projectId/documents` - Upload project documents
- `POST /updates/:updateId/media` - Upload update media
- `DELETE /projects/:projectId/images/:imageId` - Delete project image
- `DELETE /projects/:projectId/documents/:documentId` - Delete project document
- `DELETE /updates/:updateId/media/:mediaId` - Delete update media

## 📁 File Storage

The application uses **local file storage** instead of cloud services:

- **Storage Location**: Files are stored in the `uploads/` directory
- **File Access**: Files are served via `/uploads/` endpoint
- **Supported Types**: Images (JPEG, PNG, GIF, WebP), Documents (PDF, Word), Videos (MP4, MOV, AVI)
- **File Size Limit**: 10MB per file
- **Organization**: Files are organized by type and entity (projects, users, updates)

### File Structure:
\`\`\`
uploads/
├── municipality/
│   ├── avatars/          # User profile pictures
│   ├── projects/         # Project-related files
│   │   └── {projectId}/
│   │       ├── images/   # Project images
│   │       └── documents/ # Project documents
│   └── updates/          # Update-related files
│       └── {updateId}/
│           └── media/    # Update media files
\`\`\`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive request validation
- **File Validation**: Secure file type and size validation
- **CORS Protection**: Cross-origin request security
- **Helmet**: Security headers
- **Environment Variables**: Sensitive data protection

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
\`\`\`

## 📝 Code Style

\`\`\`bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
\`\`\`

## 🌍 Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `UPLOAD_PATH` - Local file storage path (default: uploads)
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 10MB)

## 📖 API Documentation

The API follows RESTful conventions with consistent response formats:

**Success Response:**
\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "message": "Error description",
  "errors": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
