import type { AvatarTraits } from '../../state/onboarding';

export type AvatarTraitKey = keyof AvatarTraits;

export type AvatarOption = {
  id: string;
  label: string;
  color: string;
  accent?: string;
};

export type AvatarTab = {
  id: AvatarTraitKey;
  label: string;
  options: AvatarOption[];
};

export const AVATAR_TABS: AvatarTab[] = [
  {
    id: 'skin',
    label: 'skin',
    options: [
      { id: 'rose', label: 'rose', color: '#F2A18B' },
      { id: 'peach', label: 'peach', color: '#E8A87C' },
      { id: 'warm', label: 'warm', color: '#C8754D' },
      { id: 'deep', label: 'deep', color: '#8E4A32' },
      { id: 'umber', label: 'umber', color: '#5D2F25' },
      { id: 'gold', label: 'gold', color: '#D99A54' },
      { id: 'cool', label: 'cool', color: '#D58D83' },
    ],
  },
  {
    id: 'hair',
    label: 'hair',
    options: [
      { id: 'soft', label: 'soft', color: '#E7C45F' },
      { id: 'crop', label: 'crop', color: '#26283B' },
      { id: 'bob', label: 'bob', color: '#1C2233' },
      { id: 'wave', label: 'wave', color: '#6B2632' },
      { id: 'bun', label: 'bun', color: '#3A241E' },
      { id: 'spike', label: 'spike', color: '#8B62D9' },
      { id: 'cap', label: 'cap', color: '#7CB0E8', accent: '#E8A87C' },
      { id: 'halo', label: 'halo', color: '#E8A87C', accent: '#F3E5A3' },
    ],
  },
  {
    id: 'eyes',
    label: 'eyes',
    options: [
      { id: 'warm', label: 'warm', color: '#151722' },
      { id: 'bright', label: 'bright', color: '#20384E' },
      { id: 'sleepy', label: 'sleepy', color: '#342638' },
      { id: 'focus', label: 'focus', color: '#11131B' },
    ],
  },
  {
    id: 'outfit',
    label: 'outfit',
    options: [
      { id: 'hoodie', label: 'hoodie', color: '#51616B' },
      { id: 'crew', label: 'crew', color: '#8E3F32' },
      { id: 'jacket', label: 'jacket', color: '#1F3650' },
      { id: 'sweater', label: 'sweater', color: '#486E54' },
      { id: 'tunic', label: 'tunic', color: '#71578E' },
      { id: 'work', label: 'work', color: '#D99A54' },
    ],
  },
  {
    id: 'accessory',
    label: 'accessory',
    options: [
      { id: 'none', label: 'none', color: '#343746' },
      { id: 'rounds', label: 'rounds', color: '#1C2233', accent: '#E8A87C' },
      { id: 'visor', label: 'visor', color: '#7CB0E8' },
      { id: 'phones', label: 'phones', color: '#B89AE8' },
      { id: 'pin', label: 'pin', color: '#9CE8A8' },
      { id: 'star', label: 'star', color: '#F3E5A3' },
    ],
  },
  {
    id: 'background',
    label: 'backdrop',
    options: [
      { id: 'amber', label: 'amber', color: '#E8A87C' },
      { id: 'blue', label: 'blue', color: '#7CB0E8' },
      { id: 'green', label: 'green', color: '#9CE8A8' },
      { id: 'purple', label: 'purple', color: '#B89AE8' },
      { id: 'coral', label: 'coral', color: '#E8756B' },
      { id: 'moss', label: 'moss', color: '#7FA075' },
      { id: 'gold', label: 'gold', color: '#D8B75C' },
      { id: 'slate', label: 'slate', color: '#51616B' },
    ],
  },
];

export const DEFAULT_AVATAR_TAB: AvatarTraitKey = 'hair';

export function getAvatarOption(trait: AvatarTraitKey, id: string) {
  const tab = AVATAR_TABS.find((item) => item.id === trait);
  return tab?.options.find((item) => item.id === id) ?? tab?.options[0];
}

export function getNextAvatarValue(trait: AvatarTraitKey, current: string) {
  const options = AVATAR_TABS.find((item) => item.id === trait)?.options ?? [];
  const index = Math.max(0, options.findIndex((item) => item.id === current));
  return options[(index + 1) % options.length]?.id ?? current;
}
