// Authentication Service
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
    }

    // Initialize auth service
    async init() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    await this.checkAdminStatus();
                } else {
                    this.currentUser = null;
                    this.isAdmin = false;
                }
                resolve(user);
            });
        });
    }

    // Check if current user has admin privileges
    async checkAdminStatus() {
        if (!this.currentUser) {
            this.isAdmin = false;
            return false;
        }

        try {
            const idToken = await this.currentUser.getIdToken(true);
            const decodedToken = await this.currentUser.getIdTokenResult();
            this.isAdmin = decodedToken.claims.admin === true;
            
            // Store the auth token for API calls
            localStorage.setItem('authToken', idToken);
            
            return this.isAdmin;
        } catch (error) {
            console.error('Error checking admin status:', error);
            this.isAdmin = false;
            return false;
        }
    }

    // Login with email and password
    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            await this.checkAdminStatus();
            
            return {
                success: true,
                user: this.currentUser,
                isAdmin: this.isAdmin
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Register new user
    async register(email, password, username) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Update profile
            await userCredential.user.updateProfile({
                displayName: username
            });

            // Save user data to Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                username: username,
                email: email,
                createdAt: new Date(),
                isAdmin: false
            });

            this.currentUser = userCredential.user;
            await this.checkAdminStatus();

            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Logout
    async logout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.isAdmin = false;
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current auth token
    async getAuthToken() {
        if (!this.currentUser) return null;
        
        try {
            return await this.currentUser.getIdToken();
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Check if user is admin
    isAdminUser() {
        return this.isAdmin;
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getAuthToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    // Reset password
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global auth service instance
const authService = new AuthService();
