import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RoomType, RoomStatus } from '../interface/chat.interface';

@Entity('chat_rooms')
@Index(['type', 'status'])
@Index(['createdAt'])
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description?: string;

  @Column({
    type: 'enum',
    enum: RoomType,
    default: RoomType.PATIENT_DOCTOR,
  })
  type: RoomType;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ nullable: true })
  lastMessageAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Message', 'room')
  messages: any[];

  @OneToMany('UserRoom', 'room')
  userRooms: any[];
} 