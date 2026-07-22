import { FULL_CODE_DATA } from '../data/codeData';
import { TREE_DATA } from '../data/treeData';
import { createRouteUtils } from '../utils/routeUtils';

export const { parseAppLocation } = createRouteUtils(
  FULL_CODE_DATA,
  TREE_DATA,
);
