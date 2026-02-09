"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useRef } from "react";
import { toast } from "sonner";


export default function Dashboard() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    const fetchUserData = async () => {
      const token = await getToken();
      if (!token) return;                                              

      const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/user/create`,
          {
            email: user.emailAddresses[0]?.emailAddress,
            name: name || "No Name",
            imageUrl: user.imageUrl,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("User checked/created:", response.data);
      } catch (err) {
        toast.error("Failed to create or fetch user data.");
        console.error("Error creating/fetching user:", err);
      }
    };

    fetchUserData();
  }, [isLoaded, user, getToken]);

  return <div>Dashboard Page</div>;
}
