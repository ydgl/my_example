package ydgl;

import java.io.IOException;


import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.SimpleTagSupport;


// TODO: test
public class MyTag extends SimpleTagSupport {
    public void doTag() throws JspException, IOException {
        //This is just to display a message, when
        //* we will use our custom tag. This message
        //* would be displayed
        //
        JspWriter out;
        String myString = "This is my own custom tag";
        out = getJspContext().getOut();
        out.println(myString);
    }
}