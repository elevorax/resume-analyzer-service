package com.example.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller to redirect all non-API, non-static-resource requests back to index.html
 * so that React Router can handle routing on the client side.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
        "/{path:^(?!api|index\\.html|assets|static|favicon\\.ico).*$}/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
