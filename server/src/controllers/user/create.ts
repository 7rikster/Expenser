import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib";
import redis from "src/lib/redis";


const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.auth();
    if (!userId) {
      return next(
        res.status(401).json({
          status: "error",
          msg: "Unauthorized",
        })
      );
    }
    const todayKey = new Date().toISOString().slice(0,10);
    const cacheKey = `user:${userId}:${todayKey}`;
    const cachedData = await redis.get(cacheKey);
    if(cachedData){
      return next(
        res.status(201).json({
          status: "success",
          data: JSON.parse(cachedData)
        })
      );
    }
    const existingUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true
      }
    });

    if (existingUser) {
      await redis.set(cacheKey, JSON.stringify({ user:existingUser}), "EX", 300);
      return next(
        res.status(201).json({
          status: "success",
          data: {user:existingUser }
        })
      );
    }

    const { email, name, imageUrl } = req.body;

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
      },
    });
    await redis.set(cacheKey, JSON.stringify({ user }), "EX", 300); 
    return next(
      res.status(201).json({
        status: "success",
        data: {user}
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
};

export default create;
