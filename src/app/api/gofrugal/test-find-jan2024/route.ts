import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent static generation

const LICENSE_KEY = '4D74C067C486AB92CA42E197C1C1A21AED615A892F9D9420D2C4D2E0CFD9A5DBC55AD86074B95482';
const BASE_URL = 'http://poppatjamals.gofrugal.com';
const HQ_PATH = '/RayMedi_HQ';

async function fetchPage(page: number): Promise<any> {
  try {
    const url = `${BASE_URL}${HQ_PATH}/api/v1/salesHeader?page=${page}&limit=100`;
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': LICENSE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log('🔍 Starting binary search for January 2024 data...');
    
    // We know:
    // - Total pages: ~4793
    // - First page has oldest data (2014)
    // - Last page has newest data (2025)
    // - Looking for Jan 2024
    
    let left = 1;
    let right = 4793;
    let targetDate = new Date('2024-01-01');
    let results: any[] = [];
    
    // First, let's check a few strategic pages to understand the distribution
    const checkPages = [1, 1000, 2000, 3000, 4000, 4500, 4700, 4793];
    
    console.log('📊 Checking strategic pages to understand date distribution:');
    
    for (const page of checkPages) {
      try {
        const data = await fetchPage(page);
        if (data.salesHeaders && data.salesHeaders.length > 0) {
          const firstDate = data.salesHeaders[0].billDate;
          const lastDate = data.salesHeaders[data.salesHeaders.length - 1].billDate;
          
          results.push({
            page,
            records: data.salesHeaders.length,
            firstDate,
            lastDate,
            firstDateFormatted: new Date(firstDate).toLocaleDateString(),
            lastDateFormatted: new Date(lastDate).toLocaleDateString()
          });
          
          console.log(`Page ${page}: ${firstDate.substring(0, 10)} to ${lastDate.substring(0, 10)}`);
        }
      } catch (error) {
        console.error(`Failed to fetch page ${page}`);
      }
    }
    
    // Now do binary search for January 2024
    console.log('\n🎯 Starting binary search for January 2024...');
    
    let foundPage = null;
    let iterations = 0;
    const maxIterations = 20;
    
    while (left <= right && iterations < maxIterations) {
      iterations++;
      const mid = Math.floor((left + right) / 2);
      
      try {
        const data = await fetchPage(mid);
        if (data.salesHeaders && data.salesHeaders.length > 0) {
          const firstDate = new Date(data.salesHeaders[0].billDate);
          const lastDate = new Date(data.salesHeaders[data.salesHeaders.length - 1].billDate);
          
          console.log(`Iteration ${iterations}: Page ${mid} - ${firstDate.toLocaleDateString()} to ${lastDate.toLocaleDateString()}`);
          
          // Check if January 2024 is within this page's range
          if (firstDate <= targetDate && lastDate >= targetDate) {
            foundPage = {
              page: mid,
              status: 'FOUND - Page contains January 2024!',
              firstDate: data.salesHeaders[0].billDate,
              lastDate: data.salesHeaders[data.salesHeaders.length - 1].billDate,
              records: data.salesHeaders.length
            };
            break;
          }
          
          // Adjust search range
          if (lastDate < targetDate) {
            // All dates on this page are before Jan 2024, search higher pages
            left = mid + 1;
          } else {
            // This page has dates after Jan 2024, search lower pages
            right = mid - 1;
          }
        }
      } catch (error) {
        console.error(`Error fetching page ${mid}, skipping...`);
        // Move to next iteration
        if (iterations % 2 === 0) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
    }
    
    // If we didn't find the exact page, find the boundary
    if (!foundPage && iterations < maxIterations) {
      console.log('\n🔄 Finding boundary pages...');
      
      // Check pages around our last search position
      const checkRange = Math.max(1, right - 5);
      const checkEnd = Math.min(4793, left + 5);
      
      for (let page = checkRange; page <= checkEnd; page++) {
        try {
          const data = await fetchPage(page);
          if (data.salesHeaders && data.salesHeaders.length > 0) {
            const firstDate = new Date(data.salesHeaders[0].billDate);
            const lastDate = new Date(data.salesHeaders[data.salesHeaders.length - 1].billDate);
            
            if (firstDate.getFullYear() === 2024 && firstDate.getMonth() === 0) {
              foundPage = {
                page,
                status: 'BOUNDARY FOUND - Page starts with January 2024!',
                firstDate: data.salesHeaders[0].billDate,
                lastDate: data.salesHeaders[data.salesHeaders.length - 1].billDate,
                records: data.salesHeaders.length
              };
              break;
            }
          }
        } catch (error) {
          console.error(`Error checking page ${page}`);
        }
      }
    }
    
    // Calculate estimate based on our findings
    const estimate = {
      targetDate: '2024-01-01',
      searchResults: results,
      foundPage,
      recommendation: foundPage 
        ? `Start fetching from page ${4793} down to page ${foundPage.page} to get all data from Jan 2024 onwards`
        : 'Based on the distribution, estimate pages 4000-4793 contain 2024-2025 data',
      pagesToFetch: foundPage 
        ? 4793 - foundPage.page + 1
        : 793,
      estimatedRecords: foundPage
        ? (4793 - foundPage.page + 1) * 100
        : 79300,
      estimatedTime: foundPage
        ? `${Math.ceil((4793 - foundPage.page + 1) / 60)} minutes with sequential fetching`
        : '~13 minutes with sequential fetching'
    };
    
    return NextResponse.json({
      success: true,
      summary: foundPage 
        ? `✅ Found! Page ${foundPage.page} contains January 2024 data`
        : '⚠️ Approximate location found - see recommendations',
      searchDistribution: results,
      binarySearchResult: foundPage,
      estimate,
      iterations,
      debug: {
        totalPages: 4793,
        targetDate: '2024-01-01',
        searchMethod: 'Binary search with boundary detection'
      }
    });

  } catch (error) {
    console.error('❌ Error during search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find January 2024 data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}