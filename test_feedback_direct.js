// Direct test of feedback API
const API_URL = 'http://localhost:3000/api/v1';

async function testFeedback() {
  try {
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tapas@example.com',
        password: 'test123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.data?.token) {
      console.error('Failed to get token');
      return;
    }

    const token = loginData.data.token;

    // Get recommendations to get a real content ID
    console.log('\n2. Getting recommendations...');
    const recsResponse = await fetch(`${API_URL}/recommendations/personalized`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const recsData = await recsResponse.json();
    console.log('Recommendations count:', recsData.data?.length);

    if (!recsData.data || recsData.data.length === 0) {
      console.error('No recommendations found');
      return;
    }

    const firstRec = recsData.data[0];
    console.log('Testing with content:', firstRec.content.title);
    console.log('Content ID:', firstRec.contentId);

    // Submit feedback - mark as not relevant
    console.log('\n3. Submitting feedback (not_relevant)...');
    const feedbackResponse = await fetch(`${API_URL}/recommendations/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        contentId: firstRec.contentId,
        contentTitle: firstRec.content.title,
        action: 'not_relevant'
      })
    });

    const feedbackData = await feedbackResponse.json();
    console.log('\nFeedback API Response:');
    console.log(JSON.stringify(feedbackData, null, 2));

    console.log('\n4. Checking response fields:');
    console.log('success:', feedbackData.success);
    console.log('preferencesUpdated:', feedbackData.preferencesUpdated);
    console.log('learnedInsightsUpdated:', feedbackData.learnedInsightsUpdated);
    console.log('shouldRemoveFromUI:', feedbackData.shouldRemoveFromUI);

    if (feedbackData.shouldRemoveFromUI === true) {
      console.log('\n✅ shouldRemoveFromUI is TRUE - frontend should remove item');
    } else {
      console.log('\n❌ shouldRemoveFromUI is NOT TRUE - this is the problem!');
      console.log('Value:', feedbackData.shouldRemoveFromUI);
      console.log('Type:', typeof feedbackData.shouldRemoveFromUI);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFeedback();
