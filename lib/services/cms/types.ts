/**
 * CMS Integration Types
 * Supports: Medium, Dev.to, Ghost, Hashnode, Shopify, Webflow,
 *           HubSpot, Wix, Blogger, Contentful, Strapi, Drupal, BigCommerce
 */

export type CMSPlatform =
  | 'medium' | 'devto' | 'ghost' | 'hashnode' | 'shopify' | 'webflow'
  | 'hubspot' | 'wix' | 'blogger' | 'contentful' | 'strapi' | 'drupal' | 'bigcommerce'

// Platform-specific credential structures
export interface MediumCredentials {
  integrationToken: string
}

export interface DevToCredentials {
  apiKey: string
}

export interface GhostCredentials {
  adminApiKey: string  // Format: {id}:{secret}
  apiUrl: string       // Ghost Admin API URL
}

export interface HashnodeCredentials {
  accessToken: string
  publicationId: string
}

export interface ShopifyCredentials {
  accessToken: string  // Admin API access token
  shopDomain: string   // mystore.myshopify.com
}

export interface WebflowCredentials {
  accessToken: string
  siteId: string
  collectionId: string  // Blog collection ID
}

export interface HubSpotCredentials {
  accessToken: string  // Private App access token
  blogId: string       // contentGroupId for the target blog
}

export interface WixCredentials {
  apiKey: string       // Wix API key
  siteId: string       // Wix site ID
}

export interface BloggerCredentials {
  accessToken: string  // Google OAuth access token
  blogId: string       // Blogger blog ID
}

export interface ContentfulCredentials {
  managementToken: string  // Content Management API personal access token
  spaceId: string          // Contentful space ID
  environmentId: string    // Usually 'master'
  contentTypeId: string    // Content type to create entries in
}

export interface StrapiCredentials {
  apiUrl: string       // Strapi instance URL
  apiToken: string     // Full-access or custom API token
  contentType: string  // API collection name (e.g. 'articles')
}

export interface DrupalCredentials {
  siteUrl: string      // Drupal site URL
  username: string     // Drupal username
  password: string     // Drupal password
  contentType: string  // Node type (default: 'article')
}

export interface BigCommerceCredentials {
  accessToken: string  // X-Auth-Token
  storeHash: string    // Store hash from API path
}

export type CMSCredentials =
  | MediumCredentials
  | DevToCredentials
  | GhostCredentials
  | HashnodeCredentials
  | ShopifyCredentials
  | WebflowCredentials
  | HubSpotCredentials
  | WixCredentials
  | BloggerCredentials
  | ContentfulCredentials
  | StrapiCredentials
  | DrupalCredentials
  | BigCommerceCredentials

// Platform metadata stored alongside the connection
export interface CMSMetadata {
  // Common
  blogUrl?: string
  username?: string

  // Medium
  authorId?: string
  publicationId?: string
  publicationName?: string

  // Hashnode
  hashnodePublicationId?: string
  hashnodePublicationName?: string

  // Shopify
  shopName?: string
  blogId?: string
  blogHandle?: string

  // Webflow
  webflowSiteName?: string
  collectionName?: string

  // HubSpot
  hubspotPortalId?: string
  hubspotBlogName?: string

  // Wix
  wixSiteName?: string

  // Blogger
  bloggerBlogName?: string

  // Contentful
  contentfulSpaceName?: string

  // Strapi
  strapiVersion?: string

  // Drupal
  drupalSiteName?: string

  // BigCommerce
  bigcommerceStoreName?: string
}

// Platform configuration
export interface CMSPlatformConfig {
  id: CMSPlatform
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  fields: CMSFieldConfig[]
  helpUrl: string
  helpText: string
}

export interface CMSFieldConfig {
  name: string
  label: string
  type: 'text' | 'password' | 'url'
  placeholder: string
  required: boolean
  helpText?: string
}

// Connection data structure
export interface CMSConnectionData {
  id: string
  userId: string
  platform: CMSPlatform
  name: string
  metadata: CMSMetadata | null
  isActive: boolean
  lastVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// API request/response types
export interface CreateCMSConnectionRequest {
  platform: CMSPlatform
  name: string
  credentials: CMSCredentials
}

export interface VerifyCMSConnectionRequest {
  platform: CMSPlatform
  credentials: CMSCredentials
}

export interface VerifyCMSConnectionResponse {
  success: boolean
  message: string
  metadata?: CMSMetadata
}

export interface ExportToCMSRequest {
  connectionId: string
  historyId: string
  title?: string
  tags?: string[]
  publishStatus?: 'draft' | 'publish'
}

export interface ExportToCMSResponse {
  success: boolean
  message: string
  postUrl?: string
  postId?: string
  editUrl?: string
}

// Platform configurations
export const CMS_PLATFORMS: CMSPlatformConfig[] = [
  {
    id: 'medium',
    name: 'Medium',
    description: 'Publish to your Medium profile or publication',
    icon: 'M',
    color: '#000000',
    bgColor: '#12100E',
    fields: [
      {
        name: 'integrationToken',
        label: 'Integration Token',
        type: 'password',
        placeholder: 'Enter your Medium integration token',
        required: true,
        helpText: 'Get your token from Medium Settings → Security and apps → Integration tokens',
      },
    ],
    helpUrl: 'https://medium.com/me/settings/security',
    helpText: 'Create an integration token in Medium Settings → Security and apps',
  },
  {
    id: 'devto',
    name: 'Dev.to',
    description: 'Publish to your Dev.to developer blog',
    icon: 'DEV',
    color: '#FFFFFF',
    bgColor: '#0A0A0A',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Dev.to API key',
        required: true,
        helpText: 'Generate an API key in Dev.to Settings → Extensions → DEV Community API Keys',
      },
    ],
    helpUrl: 'https://dev.to/settings/extensions',
    helpText: 'Generate an API key in Settings → Extensions → DEV Community API Keys',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Publish to your self-hosted or Ghost(Pro) blog',
    icon: 'G',
    color: '#FFFFFF',
    bgColor: '#15171A',
    fields: [
      {
        name: 'apiUrl',
        label: 'Ghost Admin API URL',
        type: 'url',
        placeholder: 'https://your-blog.ghost.io',
        required: true,
        helpText: 'Your Ghost site URL (e.g., https://myblog.ghost.io)',
      },
      {
        name: 'adminApiKey',
        label: 'Admin API Key',
        type: 'password',
        placeholder: 'Enter your Ghost Admin API key',
        required: true,
        helpText: 'Create a custom integration in Ghost Admin → Settings → Integrations',
      },
    ],
    helpUrl: 'https://ghost.org/docs/admin-api/',
    helpText: 'Create a custom integration in Ghost Admin → Settings → Integrations',
  },
  {
    id: 'hashnode',
    name: 'Hashnode',
    description: 'Publish to your Hashnode blog',
    icon: 'H',
    color: '#FFFFFF',
    bgColor: '#2962FF',
    fields: [
      {
        name: 'accessToken',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'Enter your Hashnode access token',
        required: true,
        helpText: 'Generate a token in Hashnode → Account Settings → Developer → Personal Access Tokens',
      },
      {
        name: 'publicationId',
        label: 'Publication ID',
        type: 'text',
        placeholder: 'Enter your Hashnode publication ID',
        required: true,
        helpText: 'Find your publication ID in your blog dashboard URL',
      },
    ],
    helpUrl: 'https://hashnode.com/settings/developer',
    helpText: 'Generate a Personal Access Token in Account Settings → Developer',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Publish to your Shopify store blog',
    icon: 'S',
    color: '#FFFFFF',
    bgColor: '#96BF48',
    fields: [
      {
        name: 'shopDomain',
        label: 'Shop Domain',
        type: 'text',
        placeholder: 'mystore.myshopify.com',
        required: true,
        helpText: 'Your Shopify store domain (e.g., mystore.myshopify.com)',
      },
      {
        name: 'accessToken',
        label: 'Admin API Access Token',
        type: 'password',
        placeholder: 'shpat_xxxxx',
        required: true,
        helpText: 'Create a custom app in Shopify Admin → Settings → Apps and sales channels → Develop apps',
      },
    ],
    helpUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps',
    helpText: 'Create a custom app with Blog read/write scopes',
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Publish to your Webflow CMS blog collection',
    icon: 'W',
    color: '#FFFFFF',
    bgColor: '#4353FF',
    fields: [
      {
        name: 'accessToken',
        label: 'API Token',
        type: 'password',
        placeholder: 'Enter your Webflow API token',
        required: true,
        helpText: 'Generate a token in Webflow → Account Settings → Integrations',
      },
      {
        name: 'siteId',
        label: 'Site ID',
        type: 'text',
        placeholder: 'Enter your Webflow site ID',
        required: true,
        helpText: 'Find your site ID in Webflow → Site Settings → General',
      },
      {
        name: 'collectionId',
        label: 'Blog Collection ID',
        type: 'text',
        placeholder: 'Enter your blog collection ID',
        required: true,
        helpText: 'Find your collection ID in Webflow CMS → Blog collection settings',
      },
    ],
    helpUrl: 'https://developers.webflow.com/docs/access-token',
    helpText: 'Generate an API token in Account Settings → Integrations',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Publish blog posts to your HubSpot CMS',
    icon: 'HS',
    color: '#FFFFFF',
    bgColor: '#FF7A59',
    fields: [
      {
        name: 'accessToken',
        label: 'Private App Access Token',
        type: 'password',
        placeholder: 'pat-na1-xxxxxxxx',
        required: true,
        helpText: 'Create a private app in HubSpot → Settings → Integrations → Private Apps',
      },
      {
        name: 'blogId',
        label: 'Blog ID',
        type: 'text',
        placeholder: 'Enter your HubSpot blog (content group) ID',
        required: true,
        helpText: 'Found in HubSpot → Marketing → Blog → Settings → Blog ID',
      },
    ],
    helpUrl: 'https://developers.hubspot.com/docs/api/cms/blog-posts',
    helpText: 'Create a private app with CMS Blog scope in Settings → Private Apps',
  },
  {
    id: 'wix',
    name: 'Wix',
    description: 'Publish blog posts to your Wix website',
    icon: 'Wx',
    color: '#FFFFFF',
    bgColor: '#0C6EFC',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Wix API key',
        required: true,
        helpText: 'Generate an API key in Wix Dashboard → Settings → API Keys',
      },
      {
        name: 'siteId',
        label: 'Site ID',
        type: 'text',
        placeholder: 'Enter your Wix site ID',
        required: true,
        helpText: 'Found in Wix Dashboard → Settings → Advanced → Site ID',
      },
    ],
    helpUrl: 'https://dev.wix.com/docs/rest/articles/getting-started/api-keys',
    helpText: 'Create an API key with Blog permissions in Wix Dashboard → Settings → API Keys',
  },
  {
    id: 'blogger',
    name: 'Blogger',
    description: 'Publish posts to your Google Blogger blog',
    icon: 'B',
    color: '#FFFFFF',
    bgColor: '#FF5722',
    fields: [
      {
        name: 'accessToken',
        label: 'OAuth Access Token',
        type: 'password',
        placeholder: 'ya29.xxxxx',
        required: true,
        helpText: 'Generate a token using Google OAuth Playground with Blogger v3 scope',
      },
      {
        name: 'blogId',
        label: 'Blog ID',
        type: 'text',
        placeholder: '1234567890',
        required: true,
        helpText: 'Found in your Blogger dashboard URL: blogger.com/blog/posts/{blogId}',
      },
    ],
    helpUrl: 'https://developers.google.com/oauthplayground/',
    helpText: 'Generate an OAuth token using Google OAuth Playground with Blogger v3 scope',
  },
  {
    id: 'contentful',
    name: 'Contentful',
    description: 'Create entries in your Contentful space',
    icon: 'Cf',
    color: '#FFFFFF',
    bgColor: '#2478CC',
    fields: [
      {
        name: 'managementToken',
        label: 'Management API Token',
        type: 'password',
        placeholder: 'CFPAT-xxxxxxxx',
        required: true,
        helpText: 'Create a Personal Access Token in Contentful → Settings → CMA tokens',
      },
      {
        name: 'spaceId',
        label: 'Space ID',
        type: 'text',
        placeholder: 'Enter your Contentful space ID',
        required: true,
        helpText: 'Found in Contentful → Settings → General settings',
      },
      {
        name: 'environmentId',
        label: 'Environment',
        type: 'text',
        placeholder: 'master',
        required: false,
        helpText: 'Environment ID (defaults to "master")',
      },
      {
        name: 'contentTypeId',
        label: 'Content Type ID',
        type: 'text',
        placeholder: 'blogPost',
        required: true,
        helpText: 'The content type ID for blog posts in your Contentful space',
      },
    ],
    helpUrl: 'https://www.contentful.com/developers/docs/references/authentication/',
    helpText: 'Create a Personal Access Token in Settings → CMA tokens',
  },
  {
    id: 'strapi',
    name: 'Strapi',
    description: 'Publish content to your Strapi CMS instance',
    icon: 'St',
    color: '#FFFFFF',
    bgColor: '#4945FF',
    fields: [
      {
        name: 'apiUrl',
        label: 'Strapi API URL',
        type: 'url',
        placeholder: 'https://your-strapi-instance.com',
        required: true,
        helpText: 'Your Strapi instance URL (e.g., https://api.example.com)',
      },
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        placeholder: 'Enter your Strapi API token',
        required: true,
        helpText: 'Create a full-access or custom API token in Strapi Admin → Settings → API Tokens',
      },
      {
        name: 'contentType',
        label: 'Content Type (API name)',
        type: 'text',
        placeholder: 'articles',
        required: true,
        helpText: 'The API name of your content type (e.g., "articles", "blog-posts")',
      },
    ],
    helpUrl: 'https://docs.strapi.io/dev-docs/configurations/api-tokens',
    helpText: 'Create an API token in Strapi Admin → Settings → API Tokens',
  },
  {
    id: 'drupal',
    name: 'Drupal',
    description: 'Publish articles to your Drupal site via JSON:API',
    icon: 'D',
    color: '#FFFFFF',
    bgColor: '#0678BE',
    fields: [
      {
        name: 'siteUrl',
        label: 'Site URL',
        type: 'url',
        placeholder: 'https://your-drupal-site.com',
        required: true,
        helpText: 'Your Drupal site URL (must have JSON:API module enabled)',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'admin',
        required: true,
        helpText: 'Drupal user with permission to create content',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your Drupal password',
        required: true,
        helpText: 'Password for the above user account',
      },
      {
        name: 'contentType',
        label: 'Content Type',
        type: 'text',
        placeholder: 'article',
        required: false,
        helpText: 'Node content type (defaults to "article")',
      },
    ],
    helpUrl: 'https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module',
    helpText: 'Ensure JSON:API module is enabled and your user has content creation permissions',
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Publish blog posts to your BigCommerce store',
    icon: 'BC',
    color: '#FFFFFF',
    bgColor: '#121118',
    fields: [
      {
        name: 'storeHash',
        label: 'Store Hash',
        type: 'text',
        placeholder: 'abc123',
        required: true,
        helpText: 'Found in your API path: api.bigcommerce.com/stores/{store_hash}',
      },
      {
        name: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Enter your BigCommerce API access token',
        required: true,
        helpText: 'Create an API account in BigCommerce Admin → Settings → API Accounts',
      },
    ],
    helpUrl: 'https://developer.bigcommerce.com/docs/start/authentication/api-accounts',
    helpText: 'Create an API account with Blog modify scope in Settings → API Accounts',
  },
]

export function getPlatformConfig(platform: CMSPlatform): CMSPlatformConfig | undefined {
  return CMS_PLATFORMS.find((p) => p.id === platform)
}
