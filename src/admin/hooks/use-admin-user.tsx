import { useQuery } from "@tanstack/react-query";
import { sdk } from "../lib/sdk";

// Define the shape of the Medusa Admin User
interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AdminUserResponse {
  user: AdminUser;
}

export const useAdminUser = () => {
  const { data, isLoading, isError, error } = useQuery<AdminUserResponse>({
    queryKey: ["admin", "users", "me"],
    queryFn: async () => {
      // Fetches the currently authenticated admin user
      return await sdk.client.fetch<AdminUserResponse>("/admin/users/me", {
        method: "GET",
      });
    },
    // Optional: Keeps the user data fresh but doesn't over-fetch
    staleTime: 5 * 60 * 1000, 
  });

  return {
    user: data?.user,
    isLoading,
    isError,
    error,
  };
};