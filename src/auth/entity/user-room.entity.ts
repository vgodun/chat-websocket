import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ChatRoom } from '../../chat/entity/chat-room.entity';
import { UserRoomRole } from '../interface/user.interface';



@Entity('user_rooms')
@Unique(['userId', 'roomId'])
@Index(['userId'])
@Index(['roomId'])
export class UserRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserRoomRole,
    default: UserRoomRole.PARTICIPANT,
  })
  role: UserRoomRole;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  lastReadAt?: Date;

  @Column({ nullable: true })
  mutedUntil?: Date;

  @Column({ default: false })
  isPinned: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.userRooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  roomId: string;

  @ManyToOne(() => ChatRoom, (room) => room.userRooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
} 