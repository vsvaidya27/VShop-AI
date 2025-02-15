// src/api/rye-buy/route.ts

import { NextResponse } from "next/server"
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'https://staging.graphql.api.rye.com/v1/query';
const client = new GraphQLClient(endpoint);
const headers = {
  "Authorization": "Basic UllFL3N0YWdpbmctMjhiMjZlMGI2YTIwNDBmM2JiNTU6",
  "Rye-Shopper-IP": "136.25.178.75"
};

export async function POST(request: Request) {
  try {
    const { asin } = await request.json()

    // Fetch product details from Rye API
    const productData = await fetchProduct(asin);

    return NextResponse.json({ success: true, message: "Item bought", data: productData })
  } catch (error) {
    console.error("Error buying item:", error)
    return NextResponse.json({ success: false, message: "Failed to buy item" }, { status: 500 })
  }
}

// New function to fetch product details from Rye API
async function fetchProduct(asin: string) {
  const query = gql`
    query DemoAmazonProductFetch($input: ProductByIDInput!) {
      product: productByID(input: $input) {
        title
        vendor
        url
        isAvailable
        images {
          url
        }
        price {
          displayValue
        }
        ... on AmazonProduct {
          ASIN
        }
      }
    }
  `;

  const variables = {
    input: {
      id: asin,
      marketplace: 'AMAZON',
    },
  };

  const data = await client.request(query, variables, headers);
  return data.product; // Return the product data
}

