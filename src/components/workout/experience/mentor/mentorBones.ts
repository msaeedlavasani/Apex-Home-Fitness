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
