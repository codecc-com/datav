import { mode } from "@chakra-ui/theme-tools";
import customColors from "./colors";

export function customClasses(props) {
    return {
        ".highlight-bg": {
            background: 'brand.50',
            borderRadius: "6px",
            color: 'black'
        },
        ".hover-bg:hover": {
            background: 'brand.50',
            borderRadius: "6px",
            color: 'black'
        },
        ".label-bg": {
            bg: mode('#f9fbfc','rgba(30,39,50,0.3)')(props)
        },
        ".bordered": {
            border: `1px solid ${mode(
                customColors.borderColor.light,
                customColors.borderColor.dark
            )(props)}`,
            borderRadius: "6px",
        },
        ".bordered-bottom": {
            borderBottom: `1px solid ${mode(
                customColors.borderColor.light,
                customColors.borderColor.dark
            )(props)}`
        },
        ".bordered-left": {
            borderLeft: `1px solid ${mode(
                customColors.borderColor.light,
                customColors.borderColor.dark
            )(props)}`
        },
        ".bordered-right": {
            borderRight: `1px solid ${mode(
                customColors.borderColor.light,
                customColors.borderColor.dark
            )(props)}`
        },
        ".bordered-top": {
            borderTop: `1px solid ${mode(
                customColors.borderColor.light,
                customColors.borderColor.dark
            )(props)}`
        },
        ".highlight-bordered": {
            border: `1px solid ${mode(
                props.theme.colors.brand["500"],
                props.theme.colors.brand["200"],
            )(props)} !important`,
            borderRadius: "6px",
        },
        ".shadowed": {
            boxShadow:
                "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px",
            borderRadius: "6px",
        },
        ".tag-bg": {
            background: mode(
                props.theme.colors.cyan["50"],
                "rgba(157, 236, 249, 0.16)"
            )(props),
            color: mode(
                props.theme.colors.cyan["800"],
                props.theme.colors.cyan["200"]
            )(props),
            borderRadius: "6px",
        },
        ".color-text": {
            color: mode(
                props.theme.colors.cyan["500"],
                props.theme.colors.cyan["200"]
            )(props)
        },
        ".chakra-form__label": {
            fontSize: ".85rem !important",
            fontWeight: "550 !important",
        },
        // 定义边栏卡片的类和样式
        ".side-card": {
            borderRadius: "16px !important",
            // borderWidth: "0 !important",
            bg: mode(customColors.sideCardBg.light+ '!important',customColors.sideCardBg.dark+ '!important')(props)
        },
        ".card-opaque": {
            borderRadius: "16px !important",
            // borderWidth: "0 !important",
            bg: mode(customColors.cardOpaqueBg.light+ '!important',customColors.cardOpaqueBg.dark+ '!important')(props)
        },
        
    }
}