/* 
This panel is for demonstration purpose, it is an external plugin, auto generated by Datav.

The origin plugin files is in https://github.com/data-observe/datav/tree/main/ui/external-plugins
*/

import { PanelPluginComponents } from "types/plugins/plugin";
import PanelComponent, { mockDataForTestDataDs } from "./Panel";
import PanelEditor from "./Editor";
import OverrideEditor, { OverrideRules, getOverrideTargets } from "./OverrideEditor";

const panelComponents: PanelPluginComponents = {
    panel: PanelComponent,
    editor: PanelEditor,
    overrideEditor: OverrideEditor,
    overrideRules: OverrideRules,
    getOverrideTargets: getOverrideTargets,
    mockDataForTestDataDs: mockDataForTestDataDs
}

export default  panelComponents