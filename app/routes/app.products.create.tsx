import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  const title = formData.get("title") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;
  const collectionId = formData.get("collectionId") as string;
  const imageUrl = formData.get("imageUrl") as string;

  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            descriptionHtml
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${title}`,
          descriptionHtml: `${description}`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const productId = responseJson.data.productCreate.product.id;
  const variantId =
    responseJson.data!.productCreate!.product!.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
      mutation shopifyRemixTemplateUpdateVariant($input: ProductVariantInput!) {
        productVariantUpdate(input: $input) {
          productVariant {
            id
            price
            barcode
            createdAt
          }
        }
      }`,
    {
      variables: {
        input: {
          id: variantId,
          price: parseFloat(price),
        },
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  await admin.graphql(
    `#graphql
      mutation addProductToCollection($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) {
          collection {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        id: collectionId,
        productIds: [productId],
      },
    },
  );

  await admin.graphql(
    `#graphql
      mutation addProductImage($productId: ID!, $media: CreateMediaInput!) {
        productCreateMedia(productId: $productId, media: [$media]) {
          media {
            mediaContentType
            status
          }
          mediaUserErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        productId: productId,
        media: {
          mediaContentType: "IMAGE",
          originalSource: imageUrl,
        },
      },
    },
  );

  return json({
    product: responseJson!.data!.productCreate!.product,
    variant: variantResponseJson!.data!.productVariantUpdate!.productVariant,
  });
};
