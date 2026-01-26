import SignUpUI from "@/module/auth/components/signUpPage";
import { requireUnAuth } from "@/module/auth/utils/auth-utils";
import React from "react";

const SignUpPage = async () => {
  await requireUnAuth();
  return <SignUpUI />;
};

export default SignUpPage;
