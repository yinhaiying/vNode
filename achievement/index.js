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


function render(vNode, container) {
    mount(vNode, container);
}
function mount(vNode, container) {
    const {  vNodeType } = vNode;
    // 不同的节点，有不同的挂载方式。文本节点单独处理
    if (vNodeType == vNodeTypes.HTML) {
        mountElement(vNode, container);
    } else if (vNodeType === vNodeTypes.TEXT) {
        mountText(vNode, container);
    }
}

function mountElement(vNode, container) {
    console.log("这里执行了吗")
    const { tag, childType,  children} = vNode;
    const dom = document.createElement(tag);
    vNode.el = dom;
    if (childType === childTypes.SINGLE) {
        mount(vNode.children, dom)
    } else if (childType === childTypes.MULTIPLE) {
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            mount(child, dom);
        }
    }
    container.appendChild(dom);
}

function mountText(vNode, container) {
    let dom = document.createTextNode(vNode.children);
    vNode.el = dom;
    container.appendChild(dom);
}