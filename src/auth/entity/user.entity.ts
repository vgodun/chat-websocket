import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole, UserStatus } from '../interface/user.interface';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column()
  @Exclude() 
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true, length: 20 })
  phoneNumber?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  licenseNumber?: string; 

  @Column({ nullable: true })
  specialization?: string; 

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @OneToMany('Message', 'sender')
  sentMessages: any[];

  @OneToMany('UserRoom', 'user')
  userRooms: any[];
} 