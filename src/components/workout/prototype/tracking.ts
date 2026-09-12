export const MENTOR_BONE_MAP = {
  head: 'Head',
  neck: 'Neck',
  chestCenter: 'Spine2',
  shoulderLeft: 'LeftArm',
  elbowLeft: 'LeftForeArm',
  wristLeft: 'LeftHand',
  shoulderRight: 'RightArm',
  elbowRight: 'RightForeArm',
  wristRight: 'RightHand',
  hipLeft: 'LeftUpLeg',
  kneeLeft: 'LeftLeg',
  ankleLeft: 'LeftFoot',
  hipRight: 'RightUpLeg',
  kneeRight: 'RightLeg',
  ankleRight: 'RightFoot',
} as const;

export type MentorBoneKey = keyof typeof MENTOR_BONE_MAP;
export type SkeletonPointKey = MentorBoneKey | 'hipCenter';
export type BonePoint = {x: number; y: number};
export type BoneProjection = Partial<Record<SkeletonPointKey, BonePoint>>;
export type VisualBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  center: number;
  pixelsPerWorldX?: number;
  pixelsPerWorldY?: number;
};

export const SKELETON_CONNECTIONS: ReadonlyArray<readonly [SkeletonPointKey, SkeletonPointKey]> = [
  ['head', 'neck'],
  ['neck', 'chestCenter'],
  ['shoulderLeft', 'chestCenter'],
  ['chestCenter', 'shoulderRight'],
  ['shoulderLeft', 'elbowLeft'],
  ['elbowLeft', 'wristLeft'],
  ['shoulderRight', 'elbowRight'],
  ['elbowRight', 'wristRight'],
  ['chestCenter', 'hipCenter'],
  ['hipLeft', 'hipCenter'],
  ['hipCenter', 'hipRight'],
  ['hipLeft', 'kneeLeft'],
  ['kneeLeft', 'ankleLeft'],
  ['hipRight', 'kneeRight'],
  ['kneeRight', 'ankleRight'],
];

export const SKELETON_POINT_ORDER: readonly SkeletonPointKey[] = [
  'head',
  'neck',
  'chestCenter',
  'shoulderLeft',
  'elbowLeft',
  'wristLeft',
  'shoulderRight',
  'elbowRight',
  'wristRight',
  'hipLeft',
  'hipCenter',
  'kneeLeft',
  'ankleLeft',
  'hipRight',
  'kneeRight',
  'ankleRight',
];

export const CORRECTION_TARGET = {
  primaryJoint: 'kneeRight',
  joints: ['hipRight', 'kneeRight', 'ankleRight'],
  edges: [
    ['hipRight', 'kneeRight'],
    ['kneeRight', 'ankleRight'],
  ],
} as const satisfies {
  primaryJoint: SkeletonPointKey;
  joints: readonly SkeletonPointKey[];
  edges: readonly (readonly [SkeletonPointKey, SkeletonPointKey])[];
};
