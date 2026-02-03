import { NextFunction, Request, Response } from "express";
import {prisma} from "../../lib";

const create = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { userId } =  req.auth();
        const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
        });

        if (existingUser) {
            return next(
                res.status(201).json({
                    status: "success",
                    data: existingUser,
                })
            );
        }

        const {email, name, imageUrl} = req.body;

        if (!email || !name) {
            return next(
                res.status(400).json({
                status: "error",
                msg: "Missing required user information",
                })
            );
        }

        const user = await prisma.user.create({
            data: {
                email,
                name,
                clerkUserId: userId,
                imageUrl: imageUrl || null,
                dailyBudget: 100,
                monthlyBudget: 3000,
            },
        });

        return next(
            res.status(201).json({
                status: "success",
                data: user,
            })
        );

    } catch (error) {
        console.error("Server error:", error);
        return next(
        res.status(500).json({
            status: "error",
            msg: "Internal server error",
        })
        );
    }
   
}

export default create;