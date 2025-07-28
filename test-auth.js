// Simple test script to verify authentication setup
const fetch = require('node-fetch');

async function testAuth() {
  console.log('🔍 Testing Authentication Setup...\n');

  // Test 1: Check if NextAuth endpoint is accessible
  try {
    console.log('1. Testing NextAuth endpoint...');
    const response = await fetch('http://localhost:3000/api/auth/session');
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Check if profiles API requires authentication
  try {
    console.log('\n2. Testing profiles API (should return 401 when not authenticated)...');
    const response = await fetch('http://localhost:3000/api/profiles');
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log('   ⚠️  Should return 401 for unauthenticated requests');
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Check if swipes API requires authentication
  try {
    console.log('\n3. Testing swipes API (should return 401 when not authenticated)...');
    const response = await fetch('http://localhost:3000/api/swipes');
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log('   ⚠️  Should return 401 for unauthenticated requests');
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Create .env.local file with your Firebase and OAuth configuration');
  console.log('2. Set up Firebase Authentication in the Firebase Console');
  console.log('3. Configure Google OAuth redirect URIs');
  console.log('4. Test the sign-in flow in your browser');
  console.log('5. Run this test again after authentication is working');
}

// Run the test
testAuth().catch(console.error); 