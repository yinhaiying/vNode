// 创建虚拟DOM函数
const vNodeTypes = {
    HTML: "HTML",
    TEXT: "TEXT",
    COMPONENT: "COMPONENT",
    CLASS_COMPONENT: "CLASS_COMPONENT"
}
const childTypes = {
    EMPTY: "EMPTY",
    SINGLE: "SINGLE",
    MULTIPLE: "MULTIPLE"
}

function createElement(tag, data, children) {

    let vNodeType;
    if (typeof tag === "string") {
        //元素是一个普通的html标签
        vNodeType = vNodeTypes.HTML;
    } else if (typeof tag === "function") {
        vNodeType = vNodeTypes.COMPONENT
    } else {
        vNodeType = vNodeTypes.TEXT
    }
    let childType;
    if (children === null) {
        childType = childTypes.EMPTY;
    } else if (Array.isArray(children)) {
        if (children.length === 0) {
            childType = childTypes.EMPTY;
        } else if (children.length >= 1) {
            childType = childTypes.MULTIPLE;
            console.log("childType:", childType)
        }
    } else {
        childType = childTypes.SINGLE;
        children = createTextVNode(children + "")
    }

    return {
        tag,
        vNodeType,
        data,
        children,
        childType
    }
}

function createTextVNode(text) {
    return {
        vNodeType: vNodeTypes.TEXT,
        tag: null,
        data: null,
        children: text,
        childType: childTypes.EMPTY
    }
}