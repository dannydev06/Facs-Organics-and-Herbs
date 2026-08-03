// scripts/setup-admin-user.js
const { auth } = require('../config/firebase-admin');

async function setupAdminUser(email, password) {
  try {
    // Check if user already exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`User ${email} already exists. Updating claims...`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        user = await auth.createUser({
          email: email,
          password: password,
          emailVerified: true,
        });
        console.log(`Created new user: ${email}`);
      } else {
        throw error;
      }
    }

    // Set custom admin claim
    await auth.setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✅ Success! User ${email} (UID: ${user.uid}) is now an admin.`);
    
    // Verify the claim was set
    const updatedUser = await auth.getUser(user.uid);
    console.log('Admin claim verified:', updatedUser.customClaims?.admin);
    
    return user;
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    throw error;
  }
}

// Get credentials from command line or use defaults
const userEmail = process.argv[2] || 'admin@facsorganics.com';
const userPassword = process.argv[3] || 'admin123';

// Run the function
setupAdminUser(userEmail, userPassword)
  .then(() => {
    console.log('\n🎉 Admin setup completed!');
    console.log(`You can now login with email: ${userEmail} and password: ${userPassword}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Admin setup failed:', error.message);
    process.exit(1);
  });