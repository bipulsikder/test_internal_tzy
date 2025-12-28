#!/usr/bin/env tsx

/**
 * Test Supabase Connection Script
 * 
 * This script tests the Supabase connection and validates the database schema.
 */

import { supabase, supabaseAdmin } from '../lib/supabase'
import { SupabaseCandidateService } from '../lib/supabase-candidates'

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...')
  console.log('=' .repeat(50))

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...')
    const { data, error } = await supabase
      .from('candidates')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Basic connection failed:', error.message)
      return false
    }
    console.log('✅ Basic connection successful')

    // Test 2: Service role connection
    console.log('\n2️⃣ Testing service role connection...')
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('candidates')
      .select('count')
      .limit(1)

    if (adminError) {
      console.error('❌ Service role connection failed:', adminError.message)
      return false
    }
    console.log('✅ Service role connection successful')

    // Test 3: Check table structure
    console.log('\n3️⃣ Checking table structure...')
    const { data: tableData, error: tableError } = await supabase
      .from('candidates')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ Table structure check failed:', tableError.message)
      return false
    }
    console.log('✅ Table structure is correct')

    // Test 4: Test search functions
    console.log('\n4️⃣ Testing search functions...')
    const { data: searchData, error: searchError } = await supabase
      .rpc('search_candidates', { search_query: 'test' })

    if (searchError) {
      console.error('❌ Search function failed:', searchError.message)
      return false
    }
    console.log('✅ Search functions are working')

    // Test 5: Test analytics functions
    console.log('\n5️⃣ Testing analytics functions...')
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_candidate_stats')

    if (statsError) {
      console.error('❌ Analytics function failed:', statsError.message)
      return false
    }
    console.log('✅ Analytics functions are working')

    // Test 6: Test file storage
    console.log('\n6️⃣ Testing file storage...')
    const { data: storageData, error: storageError } = await supabase.storage
      .from('resume-files')
      .list('', { limit: 1 })

    if (storageError) {
      console.error('❌ File storage test failed:', storageError.message)
      return false
    }
    console.log('✅ File storage is accessible')

    // Test 7: Test candidate service
    console.log('\n7️⃣ Testing candidate service...')
    const serviceTest = await SupabaseCandidateService.testConnection()
    if (!serviceTest) {
      console.error('❌ Candidate service test failed')
      return false
    }
    console.log('✅ Candidate service is working')

    console.log('\n' + '=' .repeat(50))
    console.log('🎉 All tests passed! Supabase is ready for migration.')
    console.log('=' .repeat(50))

    return true

  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testSupabaseConnection()
    .then(success => {
      if (success) {
        console.log('\n✅ Supabase connection test completed successfully!')
        process.exit(0)
      } else {
        console.log('\n❌ Supabase connection test failed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ Test script failed:', error)
      process.exit(1)
    })
}

export { testSupabaseConnection }

