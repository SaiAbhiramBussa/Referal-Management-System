import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UsePipes,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { zodValidationPipe } from '../../common/pipes';
import { createUserSchema, updateUserSchema, CreateUserDto, UpdateUserDto } from '../../common/schemas';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
            },
            required: ['email'],
        },
    })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 409, description: 'User with email already exists' })
    @UsePipes(zodValidationPipe(createUserSchema))
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update user' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @UsePipes(zodValidationPipe(updateUserSchema))
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.delete(id);
    }
}
