import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoom } from 'src/auth/entity/user-room.entity';
import { User } from 'src/auth/entity/user.entity';
import { UserRole, UserRoomRole } from 'src/auth/interface/user.interface';
import { ChatRoomResponseDto, AddParticipantsDto } from '../dto/chat-room.dto';
import { CreateChatRoomDto } from '../dto/createChatRoom.dto';
import { UpdateChatRoomDto } from '../dto/updateChatRoom.dto';
import { ChatRoom } from '../entity/chat-room.entity';
import { RoomStatus, RoomType } from '../interface/chat.interface';


@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRoom)
    private readonly userRoomRepository: Repository<UserRoom>,
  ) {}


  async createChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    creatorId: string,
  ): Promise<ChatRoomResponseDto> {
    const creator = await this.getUserById(creatorId);

    const room = this.chatRoomRepository.create({
      name: createChatRoomDto.name,
      description: createChatRoomDto.description,
      type: createChatRoomDto.type,
      status: RoomStatus.ACTIVE,
    });

    const savedRoom = await this.chatRoomRepository.save(room);

    await this.addUserToRoom(savedRoom.id, creator.id, UserRoomRole.OWNER);

    if (createChatRoomDto.participantIds?.length) {
      await this.addParticipants(savedRoom.id, creatorId, {
        userIds: createChatRoomDto.participantIds,
      });
    }

    return this.formatRoomResponse(savedRoom);
  }


  async createPatientDoctorRoom(
    patientId: string,
    doctorId: string,
  ): Promise<ChatRoomResponseDto> {
    const [patient, doctor] = await Promise.all([
      this.getUserById(patientId),
      this.getUserById(doctorId),
    ]);

    if (patient.role !== UserRole.PATIENT) {
      throw new BadRequestException('First user must be a patient');
    }

    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Second user must be a doctor');
    }

    const existingRoom = await this.findExistingPatientDoctorRoom(patientId, doctorId);
    if (existingRoom) {
      return this.formatRoomResponse(existingRoom);
    }

    const roomName = `${patient.firstName} ${patient.lastName} - ${doctor.firstName} ${doctor.lastName}`;
    const room = this.chatRoomRepository.create({
      name: roomName,
      description: `Consultation between ${patient.firstName} ${patient.lastName} and Dr. ${doctor.firstName} ${doctor.lastName}`,
      type: RoomType.PATIENT_DOCTOR,
      status: RoomStatus.ACTIVE,
      isPrivate: true,
    });

    const savedRoom = await this.chatRoomRepository.save(room);

    await Promise.all([
      this.addUserToRoom(savedRoom.id, patientId, UserRoomRole.PARTICIPANT),
      this.addUserToRoom(savedRoom.id, doctorId, UserRoomRole.PARTICIPANT),
    ]);

    return this.formatRoomResponse(savedRoom);
  }


  async getUserRooms(userId: string): Promise<ChatRoomResponseDto[]> {
    const userRooms = await this.userRoomRepository.find({
      where: { userId },
      relations: ['room', 'room.userRooms', 'room.userRooms.user'],
      order: { room: { lastMessageAt: 'DESC' } },
    });

    return userRooms.map(userRoom => this.formatRoomResponse(userRoom.room));
  }


  async getRoomById(roomId: string, userId: string): Promise<ChatRoomResponseDto> {
    await this.verifyUserRoomAccess(roomId, userId);

    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['userRooms', 'userRooms.user'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return this.formatRoomResponse(room);
  }


  async updateRoom(
    roomId: string,
    userId: string,
    updateChatRoomDto: UpdateChatRoomDto,
  ): Promise<ChatRoomResponseDto> {
    await this.verifyUserRoomPermission(roomId, userId, [UserRoomRole.OWNER, UserRoomRole.MODERATOR]);

    await this.chatRoomRepository.update(roomId, updateChatRoomDto);

    const updatedRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['userRooms', 'userRooms.user'],
    });

    return this.formatRoomResponse(updatedRoom!);
  }


  async addParticipants(
    roomId: string,
    userId: string,
    addParticipantsDto: AddParticipantsDto,
  ): Promise<void> {
    await this.verifyUserRoomPermission(roomId, userId, [UserRoomRole.OWNER, UserRoomRole.MODERATOR]);

    const users = await this.userRepository.findByIds(addParticipantsDto.userIds);
    if (users.length !== addParticipantsDto.userIds.length) {
      throw new BadRequestException('Some users not found');
    }

    await Promise.all(
      addParticipantsDto.userIds.map(participantId =>
        this.addUserToRoom(roomId, participantId, UserRoomRole.PARTICIPANT),
      ),
    );
  }


  async removeParticipant(
    roomId: string,
    userId: string,
    participantId: string,
  ): Promise<void> {
    await this.verifyUserRoomPermission(roomId, userId, [UserRoomRole.OWNER, UserRoomRole.MODERATOR]);

    const userRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId: participantId },
    });

    if (!userRoom) {
      throw new NotFoundException('Participant not found in room');
    }

    if (userRoom.role === UserRoomRole.OWNER) {
      throw new ForbiddenException('Cannot remove room owner');
    }

    await this.userRoomRepository.remove(userRoom);
  }


  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const userRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId },
    });

    if (!userRoom) {
      throw new NotFoundException('You are not a member of this room');
    }

    if (userRoom.role === UserRoomRole.OWNER) {
      const memberCount = await this.userRoomRepository.count({ where: { roomId } });
      if (memberCount > 1) {
        throw new BadRequestException('Room owner cannot leave while other members exist');
      }
      await this.chatRoomRepository.update(roomId, { status: RoomStatus.ARCHIVED });
    }

    await this.userRoomRepository.remove(userRoom);
  }


  private async findExistingPatientDoctorRoom(
    patientId: string,
    doctorId: string,
  ): Promise<ChatRoom | null> {
    const room = await this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.userRooms', 'ur1', 'ur1.userId = :patientId', { patientId })
      .innerJoin('room.userRooms', 'ur2', 'ur2.userId = :doctorId', { doctorId })
      .where('room.type = :type', { type: RoomType.PATIENT_DOCTOR })
      .andWhere('room.status = :status', { status: RoomStatus.ACTIVE })
      .getOne();

    return room;
  }


  private async addUserToRoom(
    roomId: string,
    userId: string,
    role: UserRoomRole,
  ): Promise<void> {
    const existingUserRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId },
    });

    if (existingUserRoom) {
      return;
    }

    const userRoom = this.userRoomRepository.create({
      roomId,
      userId,
      role,
    });

    await this.userRoomRepository.save(userRoom);
  }


  private async verifyUserRoomAccess(roomId: string, userId: string): Promise<void> {
    const userRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId },
    });

    if (!userRoom) {
      throw new ForbiddenException('You do not have access to this room');
    }
  }


  private async verifyUserRoomPermission(
    roomId: string,
    userId: string,
    requiredRoles: UserRoomRole[],
  ): Promise<void> {
    const userRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId },
    });

    if (!userRoom || !requiredRoles.includes(userRoom.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }


  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }


  private formatRoomResponse(room: ChatRoom): ChatRoomResponseDto {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      participants: room.userRooms?.map(userRoom => ({
        id: userRoom.user.id,
        firstName: userRoom.user.firstName,
        lastName: userRoom.user.lastName,
        role: userRoom.user.role,
        isOnline: userRoom.user.isOnline,
      })) || [],
      lastMessageAt: room.lastMessageAt,
      createdAt: room.createdAt,
    };
  }
} 