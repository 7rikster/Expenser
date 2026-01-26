import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation";


export const requireAuth = async () => {
    const {userId} = await auth();

    if(!userId){
        redirect('/sign-in');
    }
    return {userId};
}

export const requireUnAuth = async () => {
    const {userId} = await auth();

    if(userId){
        redirect('/dashboard');
    }
    return {userId};
}