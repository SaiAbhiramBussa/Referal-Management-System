import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../../common/schemas';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateUserDto) {
        // Check if email already exists
        const existing = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
            },
        });
    }

    async findAll() {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                referralsMade: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                ledgerEntries: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return user;
    }

    async update(id: string, data: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.prisma.user.delete({
            where: { id },
        });
    }
}
