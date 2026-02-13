async function testTPMJSAPI() {
  const apiKey = process.env.NEXT_PUBLIC_TPMJS_API_KEY;

  if (!apiKey) {
    console.error('❌ NEXT_PUBLIC_TPMJS_API_KEY is not set in environment');
    process.exit(1);
  }

  console.log('🔍 Testing TPMJS API connection...');
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);

  try {
    const response = await fetch('https://tpmjs.com/api/tools/search?q=test&limit=5', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ TPMJS API connection successful!');
      console.log(`Found ${data.tools?.length || 0} tools`);
      if (data.tools?.length > 0) {
        console.log('\nSample tools:');
        data.tools.forEach((tool: any, idx: number) => {
          console.log(`  ${idx + 1}. ${tool.name} - ${tool.description?.substring(0, 60)}...`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ TPMJS API connection failed:', response.status);
      console.error('Response:', errorText);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing TPMJS API:', error);
    process.exit(1);
  }
}

testTPMJSAPI().catch(console.error);
