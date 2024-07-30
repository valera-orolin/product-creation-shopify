import {
  Layout,
  Page,
  Card,
  Thumbnail,
  Text,
  Box,
  ResourceItem,
  ResourceList,
  FormLayout,
  TextField,
  Modal,
  Select
} from "@shopify/polaris"
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { json, useFetcher, useLoaderData } from "@remix-run/react";
import { ProductIcon } from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { action } from "~/routes/app._index";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const productResponse = await admin.graphql(
    `#graphql
    query fetchProducts {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }`
  );

  const collectionResponse = await admin.graphql(
    `#graphql
    query fetchCollections {
      collections(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }`
  );

  const productsData = (await productResponse.json()).data;
  const collectionsData = (await collectionResponse.json()).data;

  return json({
    products: productsData.products.edges,
    collections: collectionsData.collections.edges,
  });
}

export default function Products() {
  const { products, collections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isModalActive, setIsModalActive] = useState(false);
  const [errors, setErrors] =
    useState<{ title?: string; price?: string; description?: string; collectionId?: string; imageUrl?: string }>({});

  const renderMedia = (image: any) => {
    return image ? <Thumbnail source={image.url} alt={image.altText} />
      : <Thumbnail source={ProductIcon} alt="Product" />
  }

  const renderItem = (item: typeof products[number]) => {
    const { id, url, title, handle, featuredImage } = item.node;

    return (
      <ResourceItem
        id={id}
        url={url}
        media={renderMedia(featuredImage)}
      >
        <Text variant="bodyMd" fontWeight="bold" as="h3">
          {title}
        </Text>
        <div>{handle}</div>
      </ResourceItem>
    );
  }

  const handleCreate = () => {
    setTitle('');
    setPrice('');
    setDescription('');
    setCollectionId('');
    setImageUrl('');
    setIsModalActive(true);
  }

  const handleStore = () => {
    const newErrors: { title?: string; price?: string; description?: string; collectionId?: string; imageUrl?: string } = {};

    if (!title) {
      newErrors.title = "Title is required";
    }

    if (!price) {
      newErrors.price = "Price is required";
    }

    if (!description) {
      newErrors.description = "Description is required";
    }

    if (!collectionId) {
      newErrors.collectionId = "Collection is required";
    }

    /*
    if (!imageUrl) {
      newErrors.imageUrl = "Image URL is required";
    }*/

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", price);
    formData.append("description", description);
    formData.append("collectionId", collectionId);
    formData.append("imageUrl", imageUrl);

    fetcher.submit(
      formData,
      { method: "post", action: "/app/products/create" }
    );
    setIsModalActive(false);
  };

  const collectionOptions = collections.map((collection: any) => ({
    label: collection.node.title,
    value: collection.node.id,
  }));

  return (
    <Page>
      <ui-title-bar title="Products">
        <button onClick={handleCreate}>
          Create a new product
        </button>
      </ui-title-bar>

      <Modal
        open={isModalActive}
        onClose={() => setIsModalActive(false)}
        title="Create a new product"
        primaryAction={{
          content: 'Save',
          onAction: handleStore,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setIsModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              type="text"
              name="title"
              label="Title"
              value={title}
              onChange={(value) => setTitle(value)}
              autoComplete="on"
              error={errors.title}
            />
            <TextField
              type="number"
              name="price"
              label="Price"
              value={price}
              onChange={(value) => setPrice(value)}
              autoComplete="on"
              error={errors.price}
            />
            <TextField
              type="text"
              name="description"
              label="Description"
              value={description}
              onChange={(value) => setDescription(value)}
              autoComplete="on"
              error={errors.description}
            />
            <Select
              label="Collection"
              options={collectionOptions}
              value={collectionId}
              onChange={setCollectionId}
              error={errors.collectionId}
            />
            <TextField
              type="text"
              name="imageUrl"
              label="Image URL"
              value={imageUrl}
              onChange={(value) => setImageUrl(value)}
              autoComplete="on"
              error={errors.imageUrl}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{singular: 'customer', plural: 'customers'}}
              items={products}
              renderItem={renderItem}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
