

import SignInUI from "@/module/auth/components/signInPage";
import { requireUnAuth } from "@/module/auth/utils/auth-utils";
import React from "react";

const SignInPage = async () => {

  await requireUnAuth();
  return <SignInUI/>;
};

export default SignInPage;
