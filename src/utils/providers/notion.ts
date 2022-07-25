import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers"
import type { TokenSetParameters } from "openid-client"

interface NotionTokenSet extends TokenSetParameters {
  workspace_name?: string
  workspace_icon?: string
  workspace_id?: string
  owner?: {
    user: {
      id: string
    }
  }
}

interface NotionTokenSetParams {
  tokens: NotionTokenSet
}

export interface NotionProfile extends Record<string, any> {
  id: string
  name: string
  avatar_url: string
  person: {
    email: string
  }
  workspace: {
    name?: string
    icon?: string
    id?: string
  }
}

export interface NotionProviderOptions {
  notionVersion: string
}

export default function Notion<P extends NotionProfile>(
  options: OAuthUserConfig<P> & NotionProviderOptions
): OAuthConfig<P> {
  return {
    id: "notion",
    name: "Notion",
    type: "oauth",
    authorization: {
      url: "https://api.notion.com/v1/oauth/authorize",
      params: {
        owner: "user",
      },
    },
    token: "https://api.notion.com/v1/oauth/token",
    // userinfo: "https://api.notion.com/v1/users",
    userinfo: {
      request: async ({ tokens }: NotionTokenSetParams) => {
        const { access_token = "", workspace_icon, workspace_id, workspace_name } = tokens
        
        if (!access_token) {
          throw new Error("Notion Provider: No access token received")
        }

        const res = await fetch(
          "https://api.notion.com/v1/users/" + tokens.owner?.user.id,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "Notion-Version": options.notionVersion || "2022-06-28",
              Authorization: "Bearer " + access_token,
            },
          }
        )

        if (!res.ok) {
          throw new Error("Something went wrong while trying to get the user")
        }

        const result = await res.json()
        return {...result, workspace: { name: workspace_name, icon: workspace_icon, id: workspace_id }}
      },
    },
    profile: (profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.person.email,
      image: profile.avatar_url,
      workspace: profile.workspace,
    }),    
    ...options,
  }
}