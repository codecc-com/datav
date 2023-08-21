// Copyright 2023 Datav.io Team
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Box, useColorMode, useToast } from "@chakra-ui/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Dashboard, Panel } from "types/dashboard"
import { requestApi } from "utils/axios/request"
import DashboardHeader from "src/views/dashboard/DashboardHeader"
import DashboardGrid from "src/views/dashboard/grid/DashboardGrid"
import { clone, cloneDeep, concat, defaultsDeep, find, findIndex } from "lodash"
import { setVariableSelected } from "src/views/variables/SelectVariable"
import {  prevQueries, prevQueryData } from "src/views/dashboard/grid/PanelGrid/PanelGrid"
import { unstable_batchedUpdates } from "react-dom"
import useBus from 'use-bus'
import { SetDashboardEvent, UpdatePanelEvent } from "src/data/bus-events"
import React from "react";
import { useImmer } from "use-immer"
import { setAutoFreeze } from "immer";
import { initPanelPlugins } from "src/data/panel/initPlugins"
import { initPanelStyles } from "src/data/panel/initStyles"
import Border from "components/largescreen/components/Border"
import useFullscreen from "hooks/useFullscreen"
import { initDashboard } from "src/data/dashboard"
import { initPanel } from "src/data/panel/initPanel"
import { DashboardHeaderHeight } from "src/data/constants"
import { updateTimeToNewest } from "components/DatePicker/DatePicker"
import { $variables } from "../variables/store"
import { useStore } from "@nanostores/react"
import { VarialbeAllOption } from "src/data/variable"
import EditPanel from "./edit-panel/EditPanel"
import { $dashboard } from "./store/dashboard"
import DashboardAnnotations from "./DashboardAnnotations"
import { clearPanelRealTime } from "./store/panelRealtime"




setAutoFreeze(false)

// All of the paths that is not defined in pages directory will redirect to this page,
// generally these pages are defined in:
// 1. team's side menu, asscessed by a specific url path
// 2. dashboard page, accessed by a dashboard id
const DashboardWrapper = ({ dashboardId, sideWidth }) => {
    const vars = useStore($variables)
    const [dashboard, setDashboard] = useImmer<Dashboard>(null)
    const { colorMode, toggleColorMode } = useColorMode()
    const toast = useToast()
    // const [gVariables, setGVariables] = useState<Variable[]>([])
    const fullscreen = useFullscreen()
    useEffect(() => {
        updateTimeToNewest()
        if (!dashboard) {
            load()
        }
        return () => {
            // for (const k of Array.from(prevQueries.keys())) {
            //     prevQueries.delete(k)
            //     prevQueryData.delete(k)
            // }
            prevQueries.clear()
            prevQueryData.clear()
            clearPanelRealTime()
        } 
    }, [])


    useBus(
        (e) => { return e.type == SetDashboardEvent },
        (e) => {
            const dash = initDash(e.data)
            setDashboard(clone(dash))
        }
    )

    useBus(
        (e) => { return e.type == UpdatePanelEvent },
        (e) => {
            setDashboard((dash: Dashboard) => {
                const i = findIndex(dash.data.panels, p => p.id == e.data.id)
                if (i >= 0) {
                    dash.data.panels[i] = e.data
                }
            })
        }
    )

    useEffect(() => {
        if (dashboard) {
            $dashboard.set(dashboard)
            setTimeout(() => {
                if (dashboard.data.styles?.bgEnabled && dashboard?.data.styles?.bg) {
                    let bodyStyle = document.body.style
                    const bg = dashboard?.data.styles?.bg
                    if (bg) {
                        bodyStyle.background = bg.url
                        bodyStyle.backgroundSize = "cover"
                        if (colorMode !== bg.colorMode) {
                            toggleColorMode()
                            // toast({
                            //     title: `Change to <${bg.colorMode}> mode to better use current background`,
                            //     status: "info",
                            //     duration: 3000,
                            //     isClosable: true,
                            // })
                        }
                    }
                }
            }, 1)
        }

        return () => {
            let bodyStyle = document.body.style
            bodyStyle.background = null
        }
    }, [dashboard])


    
    const load = async () => {
        const res = await requestApi.get(`/dashboard/byId/${dashboardId}`)
        const dash = initDash(res.data)
        unstable_batchedUpdates(() => {
            setDashboard(cloneDeep(dash))
            // setTimeout(() => {
                setDashboardVariables(res.data)
            // }, 50) 
        })
    }

    const initDash = (dash) => {
        dash.data.panels.forEach((panel: Panel) => {
            // console.log("33333 before",cloneDeep(panel.plugins))
            panel = defaultsDeep(panel, initPanel())
            panel.plugins[panel.type] = defaultsDeep(panel.plugins[panel.type], initPanelPlugins()[panel.type])
            panel.styles = defaultsDeep(panel.styles, initPanelStyles)
            // console.log("33333 after",cloneDeep(panel.plugins[panel.type]),cloneDeep(panel.overrides))
        })

        const d1 = defaultsDeep(dash, initDashboard())
        return d1
    }

    // combine variables which defined separately in dashboard and global
    const setDashboardVariables = async (dash) => {
        const dashVars = cloneDeep(dash.data.variables)
        setVariableSelected(dashVars)
        const oldVars = $variables.get()
        const gVars = oldVars.filter(v => !v.id.toString().startsWith("d-"))

        $variables.set([...gVars, ...dashVars])
    }



    const onDashbardChange = useCallback(f => {
        setDashboard(f)
    }, [])

    const hidingVars = dashboard?.data?.hidingVars?.toLowerCase().split(',')
    const visibleVars = vars.filter(v => {
        return v.id.toString().startsWith("d-") || !find(hidingVars,v1 => v.name.toLowerCase().match(v1))
    })

    const headerHeight = fullscreen ? 0 : (visibleVars.length > 0 ? DashboardHeaderHeight :  (DashboardHeaderHeight - 25) ) + 7

    const panels = useMemo(() => {
        let panels
        if (dashboard) {
           const panels0 =  dashboard.data.panels.filter((panel: Panel) => {
                let render = false
                if (panel.enableConditionRender) {
                    if (panel.conditionRender.type == "variable") {
                        const cond = panel.conditionRender.value.split("=")
                        if (cond.length == 2) {
                            const v = vars.find(v => v.name == cond[0])
                            if (v.selected == VarialbeAllOption || v.selected?.match(cond[1])) {
                                render = true 
                            }
                          
                        }
                    }
                } else {
                    render = true
                }
                
                if (dashboard.data.hiddenPanels.includes(panel.id)) {
                    render = false
                }
                
               return render
            })
    
            if (panels0.length != dashboard.data.panels.length) {
                panels = panels0
            } else {
                panels = dashboard.data.panels
            }
        }

        return panels
    },[dashboard, vars])
  


    return (<>
        {dashboard && <Box px={fullscreen ? 0 : 3} width="100%" minHeight="100vh" position="relative">
            {/* <Decoration decoration={dashboard.data.styles.decoration}/> */}
            <DashboardHeader dashboard={dashboard} onChange={onDashbardChange} sideWidth={sideWidth} />
            <Box
                // key={dashboard.id + fullscreen} 
                id="dashboard-wrapper"
                mt={headerHeight+ 'px'}
                pb="2"
                position="relative"
            >
                <DashboardBorder border={dashboard.data.styles.border} />
                {dashboard.data.panels?.length > 0 && <DashboardGrid dashboard={dashboard} panels={panels} onChange={onDashbardChange} />}
            </Box>
            <EditPanel dashboard={dashboard} onChange={onDashbardChange} />
            <DashboardAnnotations dashboard={dashboard}/>
        </Box>}
    </>)
}

export default DashboardWrapper

const DashboardBorder = ({ border }) => {
    const [height, setHeight] = useState(0)
    const ref = useRef(null)
    useEffect(() => {
        ref.current = setInterval(() => {
            const ele = document.getElementById("dashboard-grid")
            const h = ele?.offsetHeight + 12
            setHeight(h)
        }, 500)
        return () => {
            clearInterval(ref.current)
        }
    }, [])


    return (
        <>
            {height > 0 && <Box key={height} position="absolute" width={'100%'} top={0} bottom={0} id="dashboard-border"><Border width="100%" height="100%" border={border}><Box height="100%" width="100%"></Box></Border></Box>}
        </>
    )
}



