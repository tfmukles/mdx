import type { RichTextField } from '../../../types';

const field: RichTextField = {
  type: 'rich-text',
  name: 'content',
  parser: {
    type: 'markdown',
  },
};

export default field;
